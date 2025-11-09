import { act, render } from '@testing-library/react'
import { waitFor } from '@testing-library/react'
import { describe, expect, it, vi, type Mock } from 'vitest'

import { ApiServerError } from '@/api/errors'
import type { SessionDetailResponse } from '@/api/types/sessions'

import { useSessionDetailViewModel } from '../useSessionDetailViewModel'

vi.mock('@/api/sessions', () => ({
  sessionsApi: {
    getSessionDetail: vi.fn(),
  },
}))

vi.mock('../logError', () => ({
  logError: vi.fn(),
}))

const { sessionsApi } = await import('@/api/sessions')
const { logError } = await import('../logError')

const getSessionDetailMock = sessionsApi.getSessionDetail as Mock

const buildSessionDetailResponse = (overrides: Partial<SessionDetailResponse['data']['attributes']> = {}): SessionDetailResponse => {
  return {
    data: {
      id: 'session-123',
      type: 'session',
      attributes: {
        session_id: 'session-123',
        title: 'Demo Session',
        relative_path: '2025/03/14/session-123.jsonl',
        created_at: '2025-03-14T09:00:00Z',
        completed_at: '2025-03-14T10:15:00Z',
        duration_seconds: 4500,
        message_count: 2,
        tool_call_count: 1,
        tool_result_count: 1,
        reasoning_count: 1,
        meta_event_count: 0,
        has_sanitized_variant: true,
        speaker_roles: [ 'user', 'assistant' ],
        checksum_sha256: 'abc',
        signature: 'sig',
        messages: [
          {
            id: 'msg-1',
            timestamp: '2025-03-14T09:00:00Z',
            source_type: 'message',
            role: 'user',
            segments: [
              {
                channel: 'input',
                type: 'text',
                text: 'ユーザーの質問',
                format: 'plain',
              },
            ],
            raw: {
              payload_type: 'default',
            },
          },
          {
            id: 'msg-2',
            timestamp: '2025-03-14T09:05:00Z',
            source_type: 'message',
            role: 'assistant',
            segments: [
              {
                channel: 'output',
                type: 'text',
                text: 'アシスタントの回答',
              },
            ],
            raw: {
              payload_type: 'reasoning',
              encrypted_content: 'encrypted-data',
            },
          },
        ],
        ...overrides,
      },
    },
    meta: {
      session: {
        relative_path: '2025/03/14/session-123.jsonl',
        raw_session_meta: {
          updated_at: '2025-03-15T12:00:00Z',
        },
      },
      links: {
        download: '/downloads/session-123.jsonl',
      },
    },
    errors: [],
  }
}

const createHookRenderer = (props?: { sessionId?: string }) => {
  const resultRef: { current: ReturnType<typeof useSessionDetailViewModel> | null } = { current: null }

  const TestComponent = ({ sessionId }: { sessionId?: string }) => {
    resultRef.current = useSessionDetailViewModel({ sessionId })
    return null
  }

  const utils = render(<TestComponent sessionId={props?.sessionId ?? 'session-123'} />)

  return {
    resultRef,
    rerender: (sessionId?: string) => utils.rerender(<TestComponent sessionId={sessionId} />),
  }
}

describe('useSessionDetailViewModel', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('セッション詳細を取得してビューモデルへ変換する', async () => {
    getSessionDetailMock.mockResolvedValueOnce(buildSessionDetailResponse())

    const { resultRef } = createHookRenderer()

    await waitFor(() => {
      expect(resultRef.current?.status).toBe('success')
    })

    expect(getSessionDetailMock).toHaveBeenCalledWith({ id: 'session-123', variant: 'original' })
    expect(resultRef.current?.detail?.title).toBe('Demo Session')
    expect(resultRef.current?.detail?.stats.messageCount).toBe(2)
    expect(resultRef.current?.detail?.messages).toHaveLength(2)
    expect(resultRef.current?.detail?.messages[0].segments[0].text).toContain('ユーザー')
    expect(resultRef.current?.hasSanitizedVariant).toBe(true)
  })

  it('暗号化 reasoning を検出しハッシュ情報を保持する', async () => {
    getSessionDetailMock.mockResolvedValueOnce(buildSessionDetailResponse())

    const { resultRef } = createHookRenderer()

    await waitFor(() => {
      expect(resultRef.current?.status).toBe('success')
    })

    const encryptedMessage = resultRef.current?.detail?.messages.find((msg) => msg.isEncryptedReasoning)
    expect(encryptedMessage).toBeDefined()
    expect(encryptedMessage?.encryptedChecksum).toBeDefined()
    expect(encryptedMessage?.encryptedChecksum?.length).toBeGreaterThanOrEqual(8)
  })

  it('API エラー時にエラー情報を保持しログする', async () => {
    const apiError = new ApiServerError({ message: 'HTTP 500', status: 500 })
    getSessionDetailMock.mockRejectedValueOnce(apiError)

    const { resultRef } = createHookRenderer()

    await waitFor(() => {
      expect(resultRef.current?.status).toBe('error')
    })

    expect(logError).toHaveBeenCalledWith(apiError, 'session-detail:fetch')
    expect(resultRef.current?.error?.kind).toBeDefined()
  })

  it('refetch を呼び出すと最新データで更新する', async () => {
    getSessionDetailMock.mockResolvedValueOnce(buildSessionDetailResponse())
    const { resultRef } = createHookRenderer()

    await waitFor(() => expect(resultRef.current?.status).toBe('success'))

    getSessionDetailMock.mockResolvedValueOnce(
      buildSessionDetailResponse({
        title: 'Updated Session',
      }),
    )

    await act(async () => {
      await resultRef.current?.refetch()
    })

    expect(resultRef.current?.detail?.title).toBe('Updated Session')
    expect(getSessionDetailMock).toHaveBeenCalledTimes(2)
  })

  it('サニタイズ版が存在しない場合は variant 切替を拒否する', async () => {
    getSessionDetailMock.mockResolvedValueOnce(buildSessionDetailResponse({ has_sanitized_variant: false }))
    const { resultRef } = createHookRenderer()

    await waitFor(() => expect(resultRef.current?.status).toBe('success'))

    expect(resultRef.current?.hasSanitizedVariant).toBe(false)

    act(() => {
      resultRef.current?.setVariant('sanitized')
    })

    expect(resultRef.current?.variant).toBe('original')
    expect(getSessionDetailMock).toHaveBeenCalledTimes(1)
  })

  it('スクロールアンカーを保存・復元できる', async () => {
    getSessionDetailMock.mockResolvedValueOnce(buildSessionDetailResponse())
    const { resultRef } = createHookRenderer()

    await waitFor(() => expect(resultRef.current?.status).toBe('success'))

    getSessionDetailMock.mockResolvedValueOnce(buildSessionDetailResponse())

    act(() => {
      resultRef.current?.preserveScrollAnchor({ offsetRatio: 0.42 })
      resultRef.current?.setVariant('sanitized')
    })

    await waitFor(() => expect(resultRef.current?.variant).toBe('sanitized'))

    expect(getSessionDetailMock).toHaveBeenNthCalledWith(2, { id: 'session-123', variant: 'sanitized' })
    expect(resultRef.current?.consumeScrollAnchor()).toEqual({ offsetRatio: 0.42 })
    expect(resultRef.current?.consumeScrollAnchor()).toBeNull()
  })
})

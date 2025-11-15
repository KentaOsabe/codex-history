import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiTimeoutError } from '@/api/errors'
import type { SessionsIndexResponse } from '@/api/types/sessions'

vi.mock('../logError', () => ({
  logError: vi.fn(),
}))

vi.mock('@/api/sessions', () => ({
  sessionsApi: {
    list: vi.fn(),
  },
}))

const loadHook = async () => (await import('../useSessionsByDateRange')).useSessionsByDateRange
const getListMock = async () => {
  const module = await import('@/api/sessions')
  return vi.mocked(module.sessionsApi.list)
}
const getLogErrorMock = async () => {
  const module = await import('../logError')
  return vi.mocked(module.logError)
}

const buildResponse = (sessionId: string, page = 1): SessionsIndexResponse => ({
  data: [
    {
      id: sessionId,
      type: 'session',
      links: {},
      attributes: {
        session_id: sessionId,
        title: sessionId,
        relative_path: `2025/03/20/${sessionId}.jsonl`,
        created_at: '2025-03-20T09:00:00Z',
        completed_at: '2025-03-20T10:00:00Z',
        duration_seconds: 1200,
        message_count: 12,
        tool_call_count: 1,
        tool_result_count: 1,
        reasoning_count: 0,
        meta_event_count: 0,
        has_sanitized_variant: false,
        speaker_roles: ['user', 'assistant'],
      },
    },
  ],
  meta: {
    page,
    per_page: 25,
    total_pages: 1,
    total_count: 1,
    filters: {
      start_date: '2025-03-10',
      end_date: '2025-03-20',
    },
  },
  errors: [],
})

describe('useSessionsByDateRange', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('開始日と終了日を指定して /api/sessions をフェッチする', async () => {
    // 目的: 指定範囲で sessionsApi.list が呼ばれ、成功レスポンスを保持できることを確認する
    const useSessionsByDateRange = await loadHook()
    const listMock = await getListMock()
    listMock.mockResolvedValueOnce(buildResponse('session-1'))

    const { result } = renderHook(() =>
      useSessionsByDateRange({ startDate: '2025-03-10', endDate: '2025-03-12', page: 2, perPage: 40 }),
    )

    await waitFor(() => expect(result.current.status).toBe('success'))

    expect(listMock).toHaveBeenCalledWith({ startDate: '2025-03-10', endDate: '2025-03-12', page: 2, perPage: 40 })
    expect(result.current.data?.data[0].id).toBe('session-1')
  })

  it('同じパラメータでの再レンダーではキャッシュを再利用する', async () => {
    // 目的: start/end/page/perPage が同一なら追加の API 呼び出しが発生しないことを保証する
    const useSessionsByDateRange = await loadHook()
    const listMock = await getListMock()
    listMock.mockResolvedValueOnce(buildResponse('session-cache'))

    const { result, rerender } = renderHook(
      ({ page }) => useSessionsByDateRange({ startDate: '2025-03-10', endDate: '2025-03-12', page }),
      { initialProps: { page: 1 } },
    )

    await waitFor(() => expect(result.current.status).toBe('success'))
    const callCountAfterFetch = listMock.mock.calls.length

    rerender({ page: 1 })

    expect(listMock.mock.calls.length).toBe(callCountAfterFetch)
    expect(result.current.status).toBe('success')
    expect(result.current.data?.data[0].id).toBe('session-cache')
  })

  it('refetch(force) で強制再取得できる', async () => {
    // 目的: ユーザー操作で再フェッチした際に force オプションでキャッシュを無効化できることを確認する
    const useSessionsByDateRange = await loadHook()
    const listMock = await getListMock()
    listMock.mockResolvedValueOnce(buildResponse('session-1'))

    const { result } = renderHook(() => useSessionsByDateRange({ startDate: '2025-03-10', endDate: '2025-03-12' }))
    await waitFor(() => expect(result.current.status).toBe('success'))

    listMock.mockResolvedValueOnce(buildResponse('session-2'))

    await act(async () => {
      const refreshed = await result.current.refetch({ force: true })
      expect(refreshed?.data[0].id).toBe('session-2')
    })

    expect(listMock).toHaveBeenCalledTimes(2)
    expect(result.current.data?.data[0].id).toBe('session-2')
  })

  it('API エラー時には mapApiErrorToFetchError の情報を返し、ログを出力する', async () => {
    // 目的: エラーを UI 向けエラーとしつつ logError を呼び出すことを検証する
    const useSessionsByDateRange = await loadHook()
    const listMock = await getListMock()
    const logError = await getLogErrorMock()
    const timeoutError = new ApiTimeoutError({ message: 'timeout', isRetryable: true })
    listMock.mockRejectedValueOnce(timeoutError)

    const { result } = renderHook(() => useSessionsByDateRange({ startDate: '2025-03-10', endDate: '2025-03-12' }))

    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(result.current.error?.kind).toBe('timeout')
    expect(logError).toHaveBeenCalledWith(timeoutError, 'sessions-date-range:fetch')
  })

  it('enabled=false または日付不足の場合はフェッチを行わず idle のまま', async () => {
    // 目的: start/end が揃わない場合に API 呼び出しをスキップできることを確認する
    const useSessionsByDateRange = await loadHook()
    const listMock = await getListMock()

    const { result } = renderHook(() =>
      useSessionsByDateRange({ startDate: undefined, endDate: undefined, enabled: false }),
    )

    expect(result.current.status).toBe('idle')
    expect(listMock).not.toHaveBeenCalled()
  })

  it('エラー発生後も最後に成功したレスポンスを data に保持する', async () => {
    // 目的: 新しいパラメータで失敗した際に前回成功データを引き続き表示できることを検証する
    const useSessionsByDateRange = await loadHook()
    const listMock = await getListMock()
    listMock.mockResolvedValueOnce(buildResponse('session-success'))

    const { result, rerender } = renderHook(
      ({ startDate, endDate, page }) => useSessionsByDateRange({ startDate, endDate, page }),
      { initialProps: { startDate: '2025-03-10', endDate: '2025-03-12', page: 1 } },
    )

    await waitFor(() => expect(result.current.status).toBe('success'))

    listMock.mockRejectedValueOnce(new ApiTimeoutError({ message: 'timeout', isRetryable: true }))

    rerender({ startDate: '2025-03-11', endDate: '2025-03-13', page: 2 })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data?.data[0].id).toBe('session-success')
  })
})

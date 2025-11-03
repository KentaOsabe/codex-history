/* eslint-disable @typescript-eslint/unbound-method */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

import type { SessionsIndexResponse } from '@/api/types/sessions'

import { useSessionsByDate } from '../useSessionsByDate'

vi.mock('@/api/sessions', () => {
  return {
    sessionsApi: {
      list: vi.fn(),
    },
  }
})

const { sessionsApi } = await import('@/api/sessions')
const mockedSessionsApi = vi.mocked(sessionsApi)
const listMock = mockedSessionsApi.list as Mock

const buildResponse = (sessionId: string): SessionsIndexResponse => ({
  data: [
    {
      id: sessionId,
      type: 'session',
      links: {},
      attributes: {
        session_id: sessionId,
        title: sessionId,
        relative_path: `2025/03/14/${sessionId}.jsonl`,
        created_at: '2025-03-14T10:00:00Z',
        completed_at: '2025-03-14T11:00:00Z',
        duration_seconds: 3600,
        message_count: 12,
        tool_call_count: 2,
        tool_result_count: 2,
        reasoning_count: 0,
        meta_event_count: 0,
        has_sanitized_variant: true,
        speaker_roles: [ 'user', 'assistant' ],
      },
    },
  ],
  meta: {
    page: 1,
    per_page: 25,
    total_pages: 1,
    total_count: 1,
    filters: {},
  },
  errors: [],
})

const TestComponent = ({ dateIso }: { dateIso: string }) => {
  const { status, data, error, refetch } = useSessionsByDate({ dateIso })

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="count">{data?.data.length ?? 0}</span>
      <span data-testid="error">{error ? 'error' : ''}</span>
      <button
        data-testid="refetch"
        onClick={() => {
          void refetch({ force: true })
        }}
      >
        refetch
      </button>
    </div>
  )
}

describe('useSessionsByDate', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('指定日付のセッションを取得して成功状態を返す', async () => {
    listMock.mockResolvedValueOnce(buildResponse('session-1'))

    render(<TestComponent dateIso="2025-03-15" />)

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('success'))

    expect(listMock).toHaveBeenCalledWith({ startDate: '2025-03-15', endDate: '2025-03-15' })
    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('同じ日付の場合はキャッシュを再利用して再リクエストしない', async () => {
    listMock.mockResolvedValueOnce(buildResponse('session-1'))

    const { rerender } = render(<TestComponent dateIso="2025-03-15" />)

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('success'))
    const callsBefore = listMock.mock.calls.length

    rerender(<TestComponent dateIso="2025-03-15" />)

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('success'))
    expect(listMock.mock.calls.length).toBe(callsBefore)
  })

  it('force オプション付き refetch で再取得する', async () => {
    listMock.mockResolvedValueOnce(buildResponse('session-1'))

    render(<TestComponent dateIso="2025-03-15" />)

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('success'))

    listMock.mockResolvedValueOnce(buildResponse('session-2'))
    fireEvent.click(screen.getByTestId('refetch'))

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('success'))
    expect(listMock).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('API エラー時にエラー状態を設定し、再取得で復旧できる', async () => {
    listMock.mockRejectedValueOnce(new Error('network-error'))

    render(<TestComponent dateIso="2025-03-16" />)

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('error'))
    expect(screen.getByTestId('error').textContent).toBe('error')

    listMock.mockResolvedValueOnce(buildResponse('session-3'))
    fireEvent.click(screen.getByTestId('refetch'))

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('success'))
    expect(screen.getByTestId('error').textContent).toBe('')
  })
})

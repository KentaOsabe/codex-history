import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionsIndexResponse } from '@/api/types/sessions'

vi.mock('../useSessionsByDate', () => ({
  useSessionsByDate: vi.fn(),
}))
vi.mock('../useSearchDraft', () => ({
  useSearchDraft: vi.fn(() => [ '', vi.fn() ]),
}))

const { useSessionsByDate } = await import('../useSessionsByDate')
const { useSearchDraft } = await import('../useSearchDraft')
const { useSessionsViewModel } = await import('../useSessionsViewModel')

const mockedUseSessionsByDate = vi.mocked(useSessionsByDate)
const mockedUseSearchDraft = vi.mocked(useSearchDraft)

const sampleResponse = (idSuffix = '1'): SessionsIndexResponse => ({
  data: [
    {
      id: `session-${idSuffix}`,
      type: 'session',
      links: {},
      attributes: {
        session_id: `session-${idSuffix}`,
        title: `Session ${idSuffix}`,
        relative_path: `2025/03/14/session-${idSuffix}.jsonl`,
        created_at: '2025-03-14T09:00:00Z',
        completed_at: '2025-03-14T10:00:00Z',
        duration_seconds: 3600,
        message_count: 12,
        tool_call_count: 1,
        tool_result_count: 1,
        reasoning_count: 0,
        meta_event_count: 0,
        has_sanitized_variant: false,
        speaker_roles: [ 'user', 'assistant' ],
        raw_session_meta: {
          summary: '会話のサマリー',
        },
      },
    },
  ],
  meta: {
    page: 1,
    per_page: 25,
    total_pages: 1,
    total_count: 1,
    filters: {},
    index: {
      updated_at: '2025-03-14T10:00:00Z',
    },
  },
  errors: [],
})

const createHookRenderer = () => {
  const result: { current: ReturnType<typeof useSessionsViewModel> | null } = { current: null }

  const TestComponent = () => {
    result.current = useSessionsViewModel()
    return null
  }

  const utils = render(<TestComponent />)
  return {
    rerender: () => utils.rerender(<TestComponent />),
    result,
  }
}

describe('useSessionsViewModel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-15T09:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('成功レスポンスを一覧アイテムへ変換する', () => {
    const successResponse = sampleResponse('1')
    mockedUseSessionsByDate.mockReturnValue({
      status: 'success',
      data: successResponse,
      error: undefined,
      refetch: vi.fn(),
    })

    const { result } = createHookRenderer()

    expect(mockedUseSessionsByDate).toHaveBeenCalledWith({ dateIso: '2025-03-15' })
    expect(result.current?.status).toBe('success')
    expect(result.current?.items).toHaveLength(1)
    expect(result.current?.activeDateIso).toBe('2025-03-15')
    expect(result.current?.lastUpdatedLabel).not.toBeFalsy()
  })

  it('エラー時でも直前の成功データを保持する', () => {
    const refetchMock = vi.fn()
    const successResponse = sampleResponse('cached')
    const errorResponse = { status: 'error' as const, data: undefined, error: new Error('network'), refetch: refetchMock }

    mockedUseSessionsByDate
      .mockReturnValueOnce({ status: 'success', data: successResponse, error: undefined, refetch: refetchMock })
      .mockReturnValueOnce(errorResponse)
      .mockReturnValue(errorResponse)

    const { rerender, result } = createHookRenderer()

    expect(result.current?.items).toHaveLength(1)

    mockedUseSessionsByDate.mockReturnValue(errorResponse)
    rerender()

    expect(result.current?.status).toBe('error')
    expect(result.current?.items).toHaveLength(1)
  })

  it('日付を変更するとフックが再評価される', () => {
    const refetchMock = vi.fn()
    const calls: string[] = []
    const responseByDate: Record<string, SessionsIndexResponse> = {
      '2025-03-15': sampleResponse('15'),
      '2025-03-20': sampleResponse('20'),
    }

    mockedUseSessionsByDate.mockImplementation(({ dateIso }) => {
      calls.push(dateIso)
      return { status: 'success', data: responseByDate[dateIso], error: undefined, refetch: refetchMock }
    })

    const { result } = createHookRenderer()

    expect(calls[0]).toBe('2025-03-15')
    act(() => {
      result.current?.setActiveDateIso('2025-03-20')
    })

    expect(calls).toContain('2025-03-20')
    expect(result.current?.activeDateIso).toBe('2025-03-20')
  })

  it('searchDraft を更新でき、refetch を委譲する', async () => {
    const refetchMock = vi.fn().mockResolvedValue(undefined)
    const successResponse = sampleResponse('1')
    mockedUseSessionsByDate.mockReturnValue({
      status: 'success',
      data: successResponse,
      error: undefined,
      refetch: refetchMock,
    })

    const setSearchDraft = vi.fn()
    mockedUseSearchDraft.mockReturnValue([ '', setSearchDraft ])

    const { result } = createHookRenderer()

    act(() => {
      result.current?.setSearchDraft('logs')
    })

    expect(setSearchDraft).toHaveBeenCalledWith('logs')

    await act(async () => {
      await result.current?.refetch({ force: true })
    })

    expect(refetchMock).toHaveBeenCalledWith({ force: true })
  })
})

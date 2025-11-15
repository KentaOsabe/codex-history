import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError, ApiTimeoutError } from '@/api/errors'
import type { SearchResponse } from '@/api/types/search'

vi.mock('../logError', () => ({
  logError: vi.fn(),
}))

vi.mock('@/api/search', () => ({
  searchApi: {
    search: vi.fn(),
  },
}))

const loadHook = async () => (await import('../useSearchResults')).useSearchResults
const getSearchMock = async () => {
  const module = await import('@/api/search')
  return vi.mocked(module.searchApi.search)
}
const getLogErrorMock = async () => {
  const module = await import('../logError')
  return vi.mocked(module.logError)
}

const buildSearchResponse = (keyword: string, page = 1): SearchResponse => ({
  data: [
    {
      id: `${keyword}-${page}`,
      type: 'search_result',
      attributes: {
        session_id: `session-${page}`,
        scope: 'chat_messages',
        highlight: `<mark>${keyword}</mark> result`,
        occurred_at: '2025-03-20T10:00:00Z',
        message_role: 'user',
        message_id: `message-${page}`,
        relative_path: `2025-03-20/session-${page}.jsonl`,
        occurrence_index: page,
      },
      links: {
        session: `/api/sessions/session-${page}`,
      },
    },
  ],
  meta: {
    pagination: {
      page,
      limit: 25,
      total_count: 1,
      total_pages: 1,
    },
    filters: {
      keyword,
      scope: 'chat_messages',
    },
  },
  errors: [],
})

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useSearchResults', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('有効なキーワードで検索APIを呼び出し、成功レスポンスを保持する', async () => {
    // 目的: 2文字以上のキーワードで searchApi が呼ばれ、状態が success になることを検証する
    const useSearchResults = await loadHook()
    const searchMock = await getSearchMock()
    searchMock.mockResolvedValueOnce(buildSearchResponse('history'))

    const { result } = renderHook(() => useSearchResults({ keyword: ' history ' }))

    await waitFor(() => expect(result.current.status).toBe('success'))

    expect(searchMock).toHaveBeenCalledWith({ keyword: 'history', page: 1, limit: 25, scope: 'chat_messages' })
    expect(result.current.data?.meta.filters.keyword).toBe('history')
    expect(result.current.fetchedAt).toBeGreaterThan(0)
  })

  it('1文字以下の入力では API を呼び出さず idle を維持する', async () => {
    // 目的: バリデーション未通過のキーワードではフェッチが起動しないことを確認する
    const useSearchResults = await loadHook()
    const searchMock = await getSearchMock()
    const { result } = renderHook(() => useSearchResults({ keyword: ' a ' }))

    expect(result.current.status).toBe('idle')
    expect(searchMock).not.toHaveBeenCalled()
  })

  it('同一条件での再レンダー時はキャッシュをヒットさせて再リクエストを避ける', async () => {
    // 目的: 直前と同じ keyword/page の場合にキャッシュ結果を使用することを保証する
    const useSearchResults = await loadHook()
    const searchMock = await getSearchMock()
    searchMock.mockResolvedValueOnce(buildSearchResponse('cache'))

    const { result, rerender } = renderHook(
      ({ page }) => useSearchResults({ keyword: 'cache', page }),
      { initialProps: { page: 1 } },
    )

    await waitFor(() => expect(result.current.status).toBe('success'))
    const callCountAfterFetch = searchMock.mock.calls.length

    rerender({ page: 1 })

    expect(searchMock.mock.calls.length).toBe(callCountAfterFetch)
    expect(result.current.status).toBe('success')
  })

  it('後続のキーワード入力で先行リクエストを中断し、最新レスポンスのみ反映する', async () => {
    // 目的: AbortController で競合リクエストを抑止できることを確認する
    const useSearchResults = await loadHook()
    const searchMock = await getSearchMock()
    const firstDeferred = createDeferred<SearchResponse>()
    searchMock.mockReturnValueOnce(firstDeferred.promise)
    searchMock.mockResolvedValueOnce(buildSearchResponse('second'))

    const { result, rerender } = renderHook(
      ({ keyword }) => useSearchResults({ keyword }),
      { initialProps: { keyword: 'first' } },
    )

    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(1))

    rerender({ keyword: 'second' })

    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(2))

    firstDeferred.resolve(buildSearchResponse('first'))

    await waitFor(() => expect(result.current.data?.meta.filters.keyword).toBe('second'))
  })

  it('API エラー時は mapApiErrorToFetchError を介したエラー情報を返す', async () => {
    // 目的: ApiClientError を UI 向けエラー表現に変換して保持することを検証する
    const useSearchResults = await loadHook()
    const searchMock = await getSearchMock()
    const logError = await getLogErrorMock()
    const apiError = new ApiClientError({
      message: 'invalid keyword',
      status: 422,
      meta: { invalid_fields: { keyword: ['2文字以上で入力してください'] } },
    })
    searchMock.mockRejectedValueOnce(apiError)

    const { result } = renderHook(() => useSearchResults({ keyword: 'a!' }))

    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(result.current.error?.invalidFields?.keyword?.[0]).toContain('2文字')
    expect(logError).toHaveBeenCalledWith(apiError, 'sessions-search:fetch')
  })

  it('refetch(force) でキャッシュを無視して再取得できる', async () => {
    // 目的: ユーザー操作により最新データへ更新できることを保証する
    const useSearchResults = await loadHook()
    const searchMock = await getSearchMock()
    searchMock.mockResolvedValueOnce(buildSearchResponse('refresh'))

    const { result } = renderHook(() => useSearchResults({ keyword: 'refresh' }))
    await waitFor(() => expect(result.current.status).toBe('success'))
    const previousTimestamp = result.current.fetchedAt

    searchMock.mockResolvedValueOnce(buildSearchResponse('refresh', 2))

    await act(async () => {
      const refreshed = await result.current.refetch({ force: true })
      expect(refreshed?.meta.pagination.page).toBe(2)
    })

    expect(searchMock).toHaveBeenCalledTimes(2)
    expect(result.current.fetchedAt).toBeGreaterThan(previousTimestamp ?? 0)
  })

  it('タイムアウトなどのリトライ不可能なエラーでは最後に成功した結果を保持する', async () => {
    // 目的: タイムアウト後もキャッシュ済みデータを維持して UI 空白を防ぐことを確認する
    const useSearchResults = await loadHook()
    const searchMock = await getSearchMock()
    searchMock.mockResolvedValueOnce(buildSearchResponse('stable'))

    const { result } = renderHook(() => useSearchResults({ keyword: 'stable' }))
    await waitFor(() => expect(result.current.status).toBe('success'))

    const timeoutError = new ApiTimeoutError({ message: 'timeout', isRetryable: true })
    searchMock.mockRejectedValueOnce(timeoutError)

    await act(async () => {
      await expect(result.current.refetch({ force: true })).rejects.toBe(timeoutError)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.data?.meta.filters.keyword).toBe('stable')
  })
})

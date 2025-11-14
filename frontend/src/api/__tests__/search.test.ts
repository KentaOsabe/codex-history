import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError } from '../errors'

const requestMock = vi.fn()

vi.mock('../httpClient', () => ({
  httpClient: {
    request: requestMock,
  },
}))

describe('searchApi', () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  afterEach(() => {
    vi.resetModules()
  })

  const loadSearchApi = async () => {
    const module = await import('../search')
    return module.searchApi
  }

  const createSearchResponse = () => ({
    data: [
      {
        id: 'session-1:message-1:1',
        type: 'search_result',
        attributes: {
          session_id: 'session-1',
          scope: 'chat_messages',
          highlight: 'run <mark>rubocop</mark> --parallel',
          occurred_at: '2025-10-01T00:00:00Z',
          message_role: 'user',
          message_id: 'message-1',
          relative_path: '2025-10-01/session-1.jsonl',
          occurrence_index: 1,
        },
        links: {
          session: '/api/sessions/session-1',
        },
      },
    ],
    meta: {
      pagination: {
        page: 1,
        limit: 10,
        total_count: 1,
        total_pages: 1,
      },
      filters: {
        keyword: 'rubocop',
        scope: 'chat_messages',
      },
      timing: {
        duration_ms: 3.2,
      },
    },
    errors: [],
  })

  it('検索キーワードをトリムし、limit をクランプしたクエリで httpClient を呼び出す', async () => {
    // 目的: searchApi が入力パラメータを正規化して /api/search を呼び出すことを検証する
    const searchApi = await loadSearchApi()
    const response = createSearchResponse()
    requestMock.mockResolvedValue(response)

    const result = await searchApi.search({
      keyword: '  rubocop ',
      page: 2,
      limit: 99,
    })

    expect(requestMock).toHaveBeenCalledWith(
      '/api/search',
      expect.objectContaining({
        method: 'GET',
        query: {
          keyword: 'rubocop',
          page: 2,
          limit: 50,
          scope: 'chat_messages',
        },
      }),
    )
    expect(result).toEqual(response)
  })

  it('scope を指定しない場合でも chat_messages を送信する', async () => {
    // 目的: scope 省略時も既定値を付与することを保証する
    const searchApi = await loadSearchApi()
    requestMock.mockResolvedValue(createSearchResponse())

    await searchApi.search({ keyword: 'history' })

    expect(requestMock).toHaveBeenCalledWith(
      '/api/search',
      expect.objectContaining({
        query: expect.objectContaining({
          scope: 'chat_messages',
        }),
      }),
    )
  })

  it('API からのクライアントエラーをそのまま伝播する', async () => {
    // 目的: httpClient が返す ApiClientError を握りつぶさず呼び出し側へ渡すことを検証する
    const searchApi = await loadSearchApi()
    const apiError = new ApiClientError({ message: 'Invalid keyword', status: 400 })
    requestMock.mockRejectedValueOnce(apiError)

    await expect(searchApi.search({ keyword: 'a' })).rejects.toBe(apiError)
  })
})

describe('buildSearchQuery', () => {
  it('page と limit を補正し、キーワードをトリムする', async () => {
    // 目的: クエリビルダーが最小/最大値や空文字の処理を行うことを保証する
    const { buildSearchQuery } = await import('../queryBuilders')

    const query = buildSearchQuery({
      keyword: '  hello ',
      page: 0,
      limit: 0,
      scope: 'chat_messages',
    })

    expect(query.keyword).toBe('hello')
    expect(query).not.toHaveProperty('page')
    expect(query.limit).toBe(1)
  })

  it('limit の上限を 50 で固定し、scope を既定で追加する', async () => {
    // 目的: 上限超過時のクランプと scope 既定値が機能することを保証する
    const { buildSearchQuery } = await import('../queryBuilders')

    const query = buildSearchQuery({
      keyword: 'rubocop',
      limit: 120,
    })

    expect(query.limit).toBe(50)
    expect(query.scope).toBe('chat_messages')
  })
})

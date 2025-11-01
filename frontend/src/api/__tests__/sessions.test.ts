import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError, ApiConflictError } from '../errors'

const requestMock = vi.fn()

vi.mock('../httpClient', () => ({
  httpClient: {
    request: requestMock,
  },
}))

describe('sessionsApi', () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  afterEach(() => {
    vi.resetModules()
  })

  const loadSessionsApi = async () => {
    const module = await import('../sessions')
    return module.sessionsApi
  }

  const createListResponse = () => ({
    data: [
      {
        id: 'session-1',
        type: 'session',
        attributes: {
          session_id: 'session-1',
          title: 'session-1',
          relative_path: '2025/10/01/session-1.jsonl',
          created_at: '2025-10-01T00:00:00Z',
          completed_at: '2025-10-01T00:10:00Z',
          duration_seconds: 600,
          message_count: 42,
          tool_call_count: 3,
          tool_result_count: 3,
          reasoning_count: 0,
          meta_event_count: 2,
          has_sanitized_variant: true,
          speaker_roles: [ 'user', 'assistant' ],
        },
      },
    ],
    meta: {
      page: 2,
      per_page: 50,
      total_pages: 5,
      total_count: 200,
      filters: {
        speaker: [ 'user', 'assistant' ],
        start_date: '2025-10-01',
        end_date: '2025-10-31',
        q: 'docker',
      },
    },
    errors: [],
  })

  it('セッション一覧をクエリ付きで取得する', async () => {
    const sessionsApi = await loadSessionsApi()
    const response = createListResponse()
    requestMock.mockResolvedValue(response)

    const result = await sessionsApi.list({
      page: 2,
      perPage: 50,
      sort: '-created_at',
      speakerRoles: [ 'user', 'assistant' ],
      startDate: '2025-10-01',
      endDate: '2025-10-31',
      query: 'docker',
    })

    expect(requestMock).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({
        method: 'GET',
        query: {
          page: 2,
          per_page: 50,
          sort: '-created_at',
          speaker: 'user,assistant',
          start_date: '2025-10-01',
          end_date: '2025-10-31',
          q: 'docker',
        },
      }),
    )
    expect(result).toEqual(response)
  })

  it('セッション詳細をサニタイズ版で取得する', async () => {
    const sessionsApi = await loadSessionsApi()
    const detailResponse = {
      data: {
        id: 'session-1',
        type: 'session',
        attributes: {
          session_id: 'session-1',
          messages: [],
          has_sanitized_variant: true,
        },
      },
      meta: {
        session: {
          relative_path: '2025/10/01/session-1-sanitzed.jsonl',
        },
      },
      errors: [],
    }
    requestMock.mockResolvedValue(detailResponse)

    const result = await sessionsApi.getSessionDetail({ id: 'session-1', variant: 'sanitized' })

    expect(requestMock).toHaveBeenCalledWith(
      '/api/sessions/session-1',
      expect.objectContaining({
        method: 'GET',
        query: { variant: 'sanitized' },
      }),
    )
    expect(result).toEqual(detailResponse)
  })

  it('インデックス再構築をリクエストしジョブ情報を受け取る', async () => {
    const sessionsApi = await loadSessionsApi()
    const refreshResponse = {
      data: {
        id: 'job-123',
        type: 'job',
        attributes: { status: 'enqueued' },
      },
      meta: {
        job: {
          queue: 'default',
          enqueued_at: '2025-10-01T00:00:00Z',
        },
      },
      errors: [],
    }
    requestMock.mockResolvedValue(refreshResponse)

    const result = await sessionsApi.requestRefresh()

    expect(requestMock).toHaveBeenCalledWith(
      '/api/sessions/refresh',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(result).toEqual(refreshResponse)
  })

  it('ジョブステータスを取得する', async () => {
    const sessionsApi = await loadSessionsApi()
    const statusResponse = {
      data: {
        id: 'job-123',
        type: 'job',
        attributes: {
          status: 'running',
        },
      },
      meta: {
        job: {
          id: 'job-123',
          status: 'running',
        },
      },
      errors: [],
    }
    requestMock.mockResolvedValue(statusResponse)

    const result = await sessionsApi.getRefreshStatus('job-123')

    expect(requestMock).toHaveBeenCalledWith(
      '/api/sessions/refresh/job-123',
      expect.objectContaining({
        method: 'GET',
      }),
    )
    expect(result).toEqual(statusResponse)
  })

  it('HTTP エラーが発生した場合は同じ例外を伝播する', async () => {
    const sessionsApi = await loadSessionsApi()
    const apiError = new ApiClientError({ message: 'Invalid', status: 422 })
    requestMock.mockRejectedValueOnce(apiError)

    await expect(sessionsApi.list({})).rejects.toBe(apiError)
  })

  it('409 コンフリクトは ApiConflictError のまま伝播する', async () => {
    const sessionsApi = await loadSessionsApi()
    const conflict = new ApiConflictError({ message: 'Refresh in progress', status: 409 })
    requestMock.mockRejectedValueOnce(conflict)

    await expect(sessionsApi.requestRefresh()).rejects.toBe(conflict)
  })
})

  it('クエリビルダーが perPage の範囲や空文字検索を調整する', async () => {
    const { buildSessionsIndexQuery } = await import('../queryBuilders')

    const query = buildSessionsIndexQuery({ perPage: 500, query: '   ', speakerRoles: [ 'user', 'user', 'assistant' ], page: 0 })

    expect(query.per_page).toBe(100)
    expect(query.speaker).toBe('user,assistant')
    expect(query).not.toHaveProperty('q')
    expect(query).not.toHaveProperty('page')
  })

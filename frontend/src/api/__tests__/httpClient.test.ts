import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadHttpClient = async () => {
  const module = await import('../httpClient')
  return module.httpClient
}

const mockEnv = (overrides: Partial<typeof import('@/config/env')['env']> = {}) => {
  vi.doMock('@/config/env', () => ({
    env: {
      apiBaseUrl: undefined,
      defaultDateRange: 7,
      ...overrides,
    },
  }))
}

describe('httpClient', () => {
  beforeEach(() => {
    mockEnv()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.useRealTimers()
  })

  it('ベースURLを考慮してJSONレスポンスを返す', async () => {
    mockEnv({ apiBaseUrl: 'https://api.example.com' })
    const responseBody = { data: { ok: true }, meta: {}, errors: [] }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    const client = await loadHttpClient()
    const result = await client.request<typeof responseBody>('/api/sessions')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/api/sessions',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      }),
    )
    expect(result).toEqual(responseBody)
  })

  it('400 番台レスポンスを ApiClientError として扱い meta を保持する', async () => {
    const errorPayload = {
      data: null,
      errors: [
        {
          code: 'invalid_parameters',
          status: '400',
          title: 'Bad Request',
          detail: 'Invalid per_page',
          meta: { invalid_fields: { per_page: ['is too large'] } },
        },
      ],
      meta: {},
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(errorPayload), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const client = await loadHttpClient()

    await expect(client.request('/api/sessions')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 400,
      meta: errorPayload.errors[0].meta,
    })
  })

  it('GET リクエストでネットワークエラーが発生した場合に既定のリトライが1回行われる', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockRejectedValueOnce(new TypeError('Network down'))
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { ok: true }, meta: {}, errors: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const client = await loadHttpClient()
    const result = await client.request('/api/sessions')

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ data: { ok: true } })
  })

  it('タイムアウトした場合は ApiTimeoutError を投げる', async () => {
    vi.useFakeTimers()

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          })
        }),
    )

    const client = await loadHttpClient()
    const promise = client.request('/api/sessions', { timeoutMs: 50, retry: { retries: 0 } })
    const expectation = expect(promise).rejects.toMatchObject({ name: 'ApiTimeoutError' })

    await vi.advanceTimersByTimeAsync(50)

    await expectation
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('500 番台レスポンスを ApiServerError として扱う', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: null, errors: [], meta: {} }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    const client = await loadHttpClient()

    await expect(client.request('/api/sessions')).rejects.toMatchObject({
      name: 'ApiServerError',
      status: 500,
    })
  })

  it('POST リクエストは既定では再試行しない', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockRejectedValue(new TypeError('Network down'))

    const client = await loadHttpClient()

    await expect(client.request('/api/sessions/refresh', { method: 'POST' })).rejects.toBeInstanceOf(Error)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('カスタムリトライ設定で指数バックオフが適用される', async () => {
    vi.useFakeTimers()

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const successResponse = new Response(JSON.stringify({ data: { ok: true }, meta: {}, errors: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

    fetchSpy
      .mockRejectedValueOnce(new TypeError('Network down 1'))
      .mockRejectedValueOnce(new TypeError('Network down 2'))
      .mockResolvedValueOnce(successResponse)

    const client = await loadHttpClient()
    const promise = client.request('/api/sessions', {
      retry: { retries: 2, delayMs: 100, factor: 2 },
    })

    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(100)
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(200)

    const result = await promise

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(result).toMatchObject({ data: { ok: true } })
  })
})

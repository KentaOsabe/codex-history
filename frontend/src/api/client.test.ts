import { afterEach, describe, expect, it, vi } from 'vitest'

const loadFetcher = async () => {
  const module = await import('./client')
  return module.fetcher
}

describe('fetcher', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.doUnmock('../config/env')
  })

  it('開発環境では相対パスを維持しつつ既定ヘッダーを送信する', async () => {
    // 目的: Vite の開発プロキシを利用し、CORS を回避しながらJSON通信ヘッダーが揃うことを保証する
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

    const fetcher = await loadFetcher()

    await fetcher('/api/sessions')

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      }),
    )
  })

  it('環境変数でベースURLが指定された場合は絶対URLに展開する', async () => {
    // 目的: 本番環境などで専用エンドポイントを指す際、指定したベースURLが尊重されることを保証する
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)
    vi.doMock('../config/env', () => ({ env: { apiBaseUrl: 'https://api.example.com', defaultDateRange: 7 } }))
    const fetcher = await loadFetcher()

    await fetcher('/api/sessions')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/api/sessions',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      }),
    )
  })
})

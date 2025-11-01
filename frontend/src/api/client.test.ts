import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetcher } from './client'

describe('fetcher', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('APIベースURLを付与しつつ既定ヘッダーを送信する', async () => {
    // 目的: 相対パスでの呼び出し時にバックエンドAPIへ正しく到達し、JSON通信の前提ヘッダーが揃うことを保証する
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse)

    await fetcher('/api/sessions')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/sessions',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      }),
    )
  })
})

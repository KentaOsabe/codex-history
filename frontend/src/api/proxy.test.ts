import { describe, expect, it } from 'vitest'

import { DEFAULT_PROXY_TARGET, resolveProxyTarget } from '@/config/proxyTarget'

describe('proxy target resolution', () => {
  it('Docker開発環境でRailsバックエンドを指す既定ターゲットを返す', () => {
    // 目的: docker compose up backend frontend で localhost ではなく backend コンテナを指すことを保証する
    expect(resolveProxyTarget(undefined)).toBe(DEFAULT_PROXY_TARGET)
    expect(resolveProxyTarget('')).toBe(DEFAULT_PROXY_TARGET)
  })

  it('環境変数で指定されたターゲットをそのまま返す', () => {
    expect(resolveProxyTarget(' https://api.example.com ')).toBe('https://api.example.com')
  })
})

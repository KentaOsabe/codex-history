import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type EnvShape = typeof import('@/config/env')['env']

const mockEnv = (overrides: Partial<EnvShape> = {}) => {
  vi.doMock('@/config/env', () => ({
    env: {
      apiBaseUrl: undefined,
      defaultDateRange: 7,
      ...overrides,
    },
  }))
}

describe('useSessionsFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-20T09:00:00Z'))
    vi.resetModules()
    mockEnv()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  const loadHook = async () => {
    const module = await import('../useSessionsFilters')
    return module.useSessionsFilters
  }

  it('既定の日数から開始日・終了日を算出し、ページネーション既定値を提供する', async () => {
    // 目的: env.defaultDateRange をもとに初期の dateRange と page/perPage を設定できることを保証する
    const useSessionsFilters = await loadHook()
    const { result } = renderHook(() => useSessionsFilters())

    expect(result.current.dateRange.startDate).toBe('2025-03-14')
    expect(result.current.dateRange.endDate).toBe('2025-03-20')
    expect(result.current.searchPagination).toMatchObject({ page: 1, limit: 25 })
    expect(result.current.listPagination).toMatchObject({ page: 1, perPage: 25 })
  })

  it('キーワードのバリデーションで2文字未満を弾き、検索ページをリセットする', async () => {
    // 目的: 最小文字数に満たないキーワードを送信させず、正しい入力時は正規化値を返すことを検証する
    const useSessionsFilters = await loadHook()
    const { result } = renderHook(() => useSessionsFilters())

    act(() => {
      result.current.setSearchPage(3)
      result.current.setKeyword(' a ')
    })

    expect(result.current.searchPagination.page).toBe(1)

    act(() => {
      expect(result.current.validateKeyword()).toBe(false)
    })
    expect(result.current.keywordError).toContain('2文字以上')
    expect(result.current.normalizedKeyword).toBeUndefined()

    act(() => {
      result.current.setKeyword(' history ')
    })

    act(() => {
      expect(result.current.validateKeyword()).toBe(true)
    })

    expect(result.current.keywordError).toBeUndefined()
    expect(result.current.normalizedKeyword).toBe('history')
    expect(result.current.searchPagination.page).toBe(1)
  })

  it('日付範囲の整合性を検証し、変更時に一覧ページをリセットする', async () => {
    // 目的: 開始日が終了日より後の場合にエラーを返し、適切な順序に戻せることを確認する
    const useSessionsFilters = await loadHook()
    const { result } = renderHook(() => useSessionsFilters())

    act(() => {
      result.current.setListPage(4)
      result.current.setDateRange({ startDate: '2025-03-18', endDate: '2025-03-17' })
    })

    expect(result.current.dateRangeError).toContain('開始日')
    expect(result.current.listPagination.page).toBe(1)

    act(() => {
      result.current.setDateRange({ startDate: '2025-03-10', endDate: '2025-03-15' })
    })

    expect(result.current.dateRange).toEqual({ startDate: '2025-03-10', endDate: '2025-03-15' })
    expect(result.current.dateRangeError).toBeUndefined()
  })

  it('ページサイズをクランプし、clearAll で初期状態に戻す', async () => {
    // 目的: limit/perPage が上限を超えた場合の補正とフィルタ全体のリセット動作を検証する
    const useSessionsFilters = await loadHook()
    const { result } = renderHook(() => useSessionsFilters())

    act(() => {
      result.current.setSearchPage(5)
      result.current.setListPage(3)
      result.current.setSearchLimit(120)
      result.current.setListPerPage(200)
    })

    expect(result.current.searchPagination).toMatchObject({ page: 1, limit: 50 })
    expect(result.current.listPagination).toMatchObject({ page: 1, perPage: 100 })

    act(() => {
      result.current.setKeyword('diff')
      result.current.validateKeyword()
      result.current.clearAll()
    })

    expect(result.current.keyword).toBe('')
    expect(result.current.normalizedKeyword).toBeUndefined()
    expect(result.current.searchPagination).toMatchObject({ page: 1, limit: 25 })
    expect(result.current.listPagination).toMatchObject({ page: 1, perPage: 25 })
    expect(result.current.dateRange.startDate).toBe('2025-03-14')
    expect(result.current.dateRange.endDate).toBe('2025-03-20')
  })
})

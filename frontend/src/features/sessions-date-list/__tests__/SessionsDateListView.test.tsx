import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SessionsDateListView from '../SessionsDateListView'
import { useSessionsViewModel } from '../useSessionsViewModel'

vi.mock('../useSessionsViewModel', () => ({
  useSessionsViewModel: vi.fn(),
}))

const mockedUseSessionsViewModel = vi.mocked(useSessionsViewModel)

describe('SessionsDateListView', () => {
  const fixedDate = new Date('2025-03-15T08:30:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  const buildViewModel = (overrides = {}) => {
    const base = {
      activeDateIso: '2025-03-15',
      setActiveDateIso: vi.fn(),
      status: 'success' as const,
      items: [
        {
          id: 'demo-session-1',
          title: 'デモセッション: サマリー付き',
          fallbackLabel: '2025/03/14/demo-session-1.jsonl',
          updatedAtLabel: '2025年3月14日 22:15',
          messageCount: 58,
          summary: 'サマリーです',
          hasSanitized: true,
        },
      ],
      error: undefined,
      searchDraft: '',
      setSearchDraft: vi.fn(),
      refetch: vi.fn().mockResolvedValue(undefined),
      lastUpdatedLabel: '2025年3月14日 22:15',
    }
    return { ...base, ...overrides }
  }

  it('カレンダー・検索・セッション一覧のセクションを表示する', () => {
    mockedUseSessionsViewModel.mockReturnValue(buildViewModel())

    render(<SessionsDateListView />)

    expect(screen.getByRole('heading', { name: '日付を選択' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'キーワード検索' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'セッション一覧' })).toBeInTheDocument()
  })

  it('初期アクティブ日付として当日ISO文字列をセットする', () => {
    mockedUseSessionsViewModel.mockReturnValue(buildViewModel())

    render(<SessionsDateListView />)

    const activeCell = screen.getByRole('gridcell', { selected: true })
    expect(activeCell).toHaveAttribute('data-date', '2025-03-15')
  })

  it('検索入力が同じ訪問中に入力テキストを保持する', () => {
    const setSearchDraft = vi.fn()
    mockedUseSessionsViewModel.mockReturnValue(buildViewModel({ setSearchDraft }))

    render(<SessionsDateListView />)

    const input = screen.getByPlaceholderText('キーワードで検索')
    fireEvent.change(input, { target: { value: 'logs' } })

    expect(setSearchDraft).toHaveBeenCalledWith('logs')
  })

  it('スタブデータのセッションカードを表示する', () => {
    mockedUseSessionsViewModel.mockReturnValue(buildViewModel())

    render(<SessionsDateListView />)

    expect(screen.getByRole('heading', { name: 'デモセッション: サマリー付き' })).toBeInTheDocument()
  })
})

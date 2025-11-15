import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import SearchAndFilterPanel from '../SearchAndFilterPanel'

describe('SearchAndFilterPanel', () => {
  const baseProps = {
    keyword: '',
    keywordError: undefined,
    dateRange: { startDate: '2025-03-10', endDate: '2025-03-17' },
    dateRangeError: undefined,
    onKeywordChange: vi.fn(),
    onSubmit: vi.fn(),
    onDateRangeChange: vi.fn(),
    onClearFilters: vi.fn(),
    isSearchDisabled: false,
  }

  it('検索ボタン押下で onSubmit を呼び出す', async () => {
    // 目的: ユーザー操作により検索処理がトリガーされることを保証する
    const user = userEvent.setup()
    const onKeywordChange = vi.fn()
    const onSubmit = vi.fn()

    render(
      <SearchAndFilterPanel
        {...baseProps}
        onKeywordChange={onKeywordChange}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByPlaceholderText('キーワードで検索'), 'history')
    expect(onKeywordChange).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '検索を実行' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('バリデーションエラーを aria-live 領域で読み上げる', () => {
    // 目的: エラーが発生した際に支援技術へ即座に通知できることを確認する
    render(
      <SearchAndFilterPanel
        {...baseProps}
        keywordError="キーワードは2文字以上で入力してください"
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('キーワードは2文字以上で入力してください')
  })

  it('フィルタリセットボタンで onClearFilters を呼ぶ', async () => {
    // 目的: ユーザーが一括で状態をリセットできる導線を検証する
    const user = userEvent.setup()
    const onClearFilters = vi.fn()

    render(
      <SearchAndFilterPanel
        {...baseProps}
        onClearFilters={onClearFilters}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'フィルタをリセット' }))
    expect(onClearFilters).toHaveBeenCalledTimes(1)
  })
})

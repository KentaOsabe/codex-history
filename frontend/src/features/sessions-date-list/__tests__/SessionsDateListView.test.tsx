import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SessionsDateListView from '../SessionsDateListView'

describe('SessionsDateListView', () => {
  const fixedDate = new Date('2025-03-15T08:30:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('カレンダー・検索・セッション一覧のセクションを表示する', () => {
    render(<SessionsDateListView />)

    expect(screen.getByRole('heading', { name: '日付を選択' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'キーワード検索' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'セッション一覧' })).toBeInTheDocument()
  })

  it('初期アクティブ日付として当日ISO文字列をセットする', () => {
    render(<SessionsDateListView />)

    const activeCell = screen.getByRole('gridcell', { selected: true })
    expect(activeCell).toHaveAttribute('data-date', '2025-03-15')
  })

  it('検索入力が同じ訪問中に入力テキストを保持する', () => {
    render(<SessionsDateListView />)

    const input = screen.getByPlaceholderText('キーワードで検索')
    fireEvent.change(input, { target: { value: 'logs' } })

    fireEvent.blur(input)
    fireEvent.focus(input)

    expect(input).toHaveValue('logs')
  })

  it('スタブデータのセッションカードを表示する', () => {
    render(<SessionsDateListView />)

    expect(screen.getByRole('heading', { name: 'デモセッション: サマリー付き' })).toBeInTheDocument()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import CalendarStrip from '../CalendarStrip'
import { toISODate } from '../dateUtils'

describe('CalendarStrip', () => {
  const activeDate = toISODate(new Date(Date.UTC(2025, 0, 15)))

  it('日付グリッドと月移動ボタンを表示する', () => {
    const onSelect = vi.fn()
    const onNavigateMonth = vi.fn()

    render(
      <CalendarStrip
        activeDateIso={activeDate}
        onSelect={onSelect}
        onNavigateMonth={onNavigateMonth}
      />,
    )

    expect(screen.getByRole('grid')).toBeInTheDocument()
    expect(screen.getAllByRole('gridcell')).toHaveLength(21)
    expect(screen.getByRole('button', { name: '前の月' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '次の月' })).toBeInTheDocument()
  })

  it('アクティブ日付に aria-selected を設定する', () => {
    render(
      <CalendarStrip
        activeDateIso={activeDate}
        onSelect={vi.fn()}
        onNavigateMonth={vi.fn()}
      />,
    )

    const activeCell = screen.getByRole('gridcell', { selected: true })
    expect(activeCell).toHaveAttribute('data-date', activeDate)
  })

  it('矢印キーとEnterで日付選択を行う', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <CalendarStrip
        activeDateIso={activeDate}
        onSelect={onSelect}
        onNavigateMonth={vi.fn()}
      />,
    )

    const activeCell = screen.getByRole('gridcell', { selected: true })
    activeCell.focus()

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith('2025-01-16')
  })

  it('月移動ボタンでコールバックを呼び出す', () => {
    const onNavigateMonth = vi.fn()

    render(
      <CalendarStrip
        activeDateIso={activeDate}
        onSelect={vi.fn()}
        onNavigateMonth={onNavigateMonth}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '前の月' }))
    fireEvent.click(screen.getByRole('button', { name: '次の月' }))

    expect(onNavigateMonth).toHaveBeenNthCalledWith(1, -1)
    expect(onNavigateMonth).toHaveBeenNthCalledWith(2, 1)
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SessionList from '../SessionList'

const sampleItems = [
  {
    id: 'session-1',
    title: 'Session Title',
    fallbackLabel: 'session-1.jsonl',
    updatedAtLabel: '2025/02/01 10:00',
    messageCount: 10,
    summary: 'サマリーをここに表示',
    hasSanitized: false,
  },
]

describe('SessionList', () => {
  it('ready variant でセッションカードを表示する', () => {
    render(<SessionList variant="ready" items={sampleItems} onSelect={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Session Title' })).toBeInTheDocument()
  })

  it('loading variant でスケルトンを表示する', () => {
    render(<SessionList variant="loading" items={[]} onSelect={vi.fn()} />)

    expect(screen.getAllByTestId('session-card-skeleton')).toHaveLength(3)
  })

  it('empty variant で空状態メッセージを表示する', () => {
    render(<SessionList variant="empty" items={[]} onSelect={vi.fn()} />)

    expect(screen.getByText('指定した期間内のセッションはありません')).toBeInTheDocument()
  })

  it('contextLabel を渡すとバッジを表示する', () => {
    render(<SessionList variant="ready" items={sampleItems} onSelect={vi.fn()} contextLabel="期間フィルタ" />)

    expect(screen.getByText('期間フィルタ')).toBeInTheDocument()
  })
})

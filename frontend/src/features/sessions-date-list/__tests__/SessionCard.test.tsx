import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SessionCard from '../SessionCard'

const baseItem = {
  id: 'session-1',
  title: 'Session Title',
  fallbackLabel: '2025/02/01/session-1.jsonl',
  updatedAtLabel: '2025年2月1日 10:00',
  messageCount: 42,
  summary: '最新の作業サマリーがここに表示されます。',
  hasSanitized: true,
}

describe('SessionCard', () => {
  it('タイトルとメタ情報を表示する', () => {
    const handleSelect = vi.fn()

    render(<SessionCard item={baseItem} onSelect={handleSelect} />)

    expect(screen.getByRole('heading', { name: 'Session Title' })).toBeInTheDocument()
    expect(screen.getByText('42件')).toBeInTheDocument()
    expect(screen.getByText('2025年2月1日 10:00')).toBeInTheDocument()
  })

  it('タイトルがない場合フォールバックラベルを表示する', () => {
    const handleSelect = vi.fn()

    render(<SessionCard item={{ ...baseItem, title: '' }} onSelect={handleSelect} />)

    expect(screen.getByRole('heading', { name: '2025/02/01/session-1.jsonl' })).toBeInTheDocument()
  })
})

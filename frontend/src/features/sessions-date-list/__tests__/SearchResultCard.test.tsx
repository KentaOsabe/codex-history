import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SearchResultCard, { type SearchResultCardViewModel } from '../SearchResultCard'

const baseResult: SearchResultCardViewModel = {
  id: 'result-1',
  sessionId: 'session-42',
  highlightHtml: '<mark>history</mark> を含むメッセージ',
  occurredAtLabel: '2025年3月10日 10:00',
  roleLabel: 'ユーザー',
  hitCount: 1,
  isPrimaryHit: true,
}

describe('SearchResultCard', () => {
  it('API セッションリンクをクライアント用パスに変換して遷移する', () => {
    const handleSelect = vi.fn()

    render(
      <SearchResultCard
        result={{ ...baseResult, sessionLink: '/api/sessions/session-42' }}
        onSelect={handleSelect}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'session-42 を開く' }))

    expect(handleSelect).toHaveBeenCalledWith('session-42', {
      targetPath: '/sessions/session-42',
    })
  })

  it('クライアント用 URL の場合は変換せずに使用する', () => {
    const handleSelect = vi.fn()

    render(
      <SearchResultCard
        result={{
          ...baseResult,
          sessionLink: 'https://app.example.com/sessions/custom-session',
          sessionId: 'custom-session',
        }}
        onSelect={handleSelect}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'custom-session を開く' }))

    expect(handleSelect).toHaveBeenCalledWith('custom-session', {
      targetPath: 'https://app.example.com/sessions/custom-session',
    })
  })

  it('リンクがない場合は sessionId だけで遷移する', () => {
    const handleSelect = vi.fn()

    render(<SearchResultCard result={baseResult} onSelect={handleSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'session-42 を開く' }))

    expect(handleSelect).toHaveBeenCalledWith('session-42', undefined)
  })
})

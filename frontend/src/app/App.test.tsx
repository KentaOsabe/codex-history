import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import App from './App'
import { useSessionsViewModel } from '../features/sessions-date-list/useSessionsViewModel'

vi.mock('../features/sessions-date-list/useSessionsViewModel', () => ({
  useSessionsViewModel: vi.fn(),
}))

const mockedUseSessionsViewModel = vi.mocked(useSessionsViewModel)

describe('App', () => {
  it('アプリタイトルと初期ガイダンスを表示する', () => {
    // 目的: ユーザーが初回アクセス時に閲覧の起点と次の行動を理解できることを保証する
    mockedUseSessionsViewModel.mockReturnValue({
      activeDateIso: '2025-03-15',
      setActiveDateIso: vi.fn(),
      status: 'success',
      items: [],
      error: undefined,
      searchDraft: '',
      setSearchDraft: vi.fn(),
      refetch: vi.fn(),
      lastUpdatedLabel: undefined,
    })

    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Codex会話履歴ビューア' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('日付を選択するとその日のセッションが表示されます'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'セッション一覧' })).toBeInTheDocument()
  })
})

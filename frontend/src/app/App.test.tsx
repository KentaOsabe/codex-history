import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import App from './App'

vi.mock('../features/sessions-date-list/SessionsDateListView', () => ({
  __esModule: true,
  default: () => <div data-testid="sessions-view-placeholder">Sessions view loaded</div>,
}))

describe('App', () => {
  it('アプリタイトルと初期ガイダンスを表示する', () => {
    // 目的: ユーザーが初回アクセス時に閲覧の起点と次の行動を理解できることを保証する
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Codex会話履歴ビューア' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('日付を選択するとその日のセッションが表示されます'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('sessions-view-placeholder')).toBeInTheDocument()
  })
})

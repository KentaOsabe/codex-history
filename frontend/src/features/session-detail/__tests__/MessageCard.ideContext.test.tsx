import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import MessageCard from '../MessageCard'

import type { IdeContextPreferenceState, SessionMessageViewModel } from '../types'

const buildMessage = (overrides?: Partial<SessionMessageViewModel>): SessionMessageViewModel => ({
  id: overrides?.id ?? 'user-1',
  timestampIso: overrides?.timestampIso ?? '2025-03-14T09:00:00Z',
  timestampLabel: overrides?.timestampLabel ?? '2025/03/14 09:00:00',
  role: 'user',
  sourceType: 'message',
  channel: 'input',
  segments: overrides?.segments ?? [
    {
      id: 'seg-1',
      channel: 'input',
      text: '本文',
    },
  ],
  toolCall: undefined,
  isEncryptedReasoning: false,
  metadata: {
    ideContext: {
      sections: [
        {
          heading: 'My request for Codex',
          content: 'タスク 6 を実行',
          defaultExpanded: true,
        },
        {
          heading: 'Active file',
          content: 'frontend/src/App.tsx',
          defaultExpanded: false,
        },
      ],
    },
  },
})

const renderWithPreference = (message: SessionMessageViewModel, preference?: IdeContextPreferenceState) => {
  return render(
    <MessageCard
      message={message}
      ideContextPreference={{
        sections:
          preference?.sections ?? [
            { key: 'my-request-for-codex', heading: 'My request for Codex', alwaysVisible: false, defaultExpanded: true },
            { key: 'active-file', heading: 'Active file', alwaysVisible: false, defaultExpanded: false },
          ],
        setAlwaysVisible: preference?.setAlwaysVisible ?? vi.fn(),
      }}
    />,
  )
}

describe('MessageCard – IDE コンテキスト', () => {
  it('初期状態では IDE コンテキストを折りたたみ、展開時に defaultExpanded を反映する', async () => {
    const user = userEvent.setup()
    renderWithPreference(buildMessage())

    expect(screen.getByRole('heading', { name: 'IDE コンテキスト' })).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: /IDE コンテキスト/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('ide-context-section-my-request-for-codex')).not.toBeInTheDocument()

    await user.click(toggle)

    const requestSection = await screen.findByTestId('ide-context-section-my-request-for-codex')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(requestSection).toHaveAttribute('open')

    const activeSection = screen.getByTestId('ide-context-section-active-file')
    expect(activeSection).not.toHaveAttribute('open')
  })

  it('常に表示チェックボックスでプリファレンス変更イベントを発火する', async () => {
    const user = userEvent.setup()
    const setAlwaysVisible = vi.fn()

    renderWithPreference(buildMessage(), {
      sections: [
        { key: 'my-request-for-codex', heading: 'My request for Codex', alwaysVisible: false, defaultExpanded: true },
        { key: 'active-file', heading: 'Active file', alwaysVisible: false, defaultExpanded: false },
      ],
      setAlwaysVisible,
    })

    await user.click(screen.getByRole('button', { name: /IDE コンテキスト/ }))

    const checkbox = screen.getByRole('checkbox', { name: 'Active file を常に表示' })
    await user.click(checkbox)

    expect(setAlwaysVisible).toHaveBeenCalledWith('active-file', true)
  })

  it('手動で閉じたセクションはプリファレンス変更後も閉じたまま維持される', async () => {
    const user = userEvent.setup()
    const message = buildMessage()

    const preference: IdeContextPreferenceState = {
      sections: [
        { key: 'my-request-for-codex', heading: 'My request for Codex', alwaysVisible: false, defaultExpanded: true },
        { key: 'active-file', heading: 'Active file', alwaysVisible: false, defaultExpanded: false },
      ],
      setAlwaysVisible: vi.fn(),
    }

    const { rerender } = render(<MessageCard message={message} ideContextPreference={preference} />)

    await user.click(screen.getByRole('button', { name: /IDE コンテキスト/ }))

    const requestSection = screen.getByTestId('ide-context-section-my-request-for-codex')
    await user.click(within(requestSection).getByText('My request for Codex'))
    expect(requestSection).not.toHaveAttribute('open')

    rerender(
      <MessageCard
        message={message}
        ideContextPreference={{
          sections: [
            { key: 'my-request-for-codex', heading: 'My request for Codex', alwaysVisible: false, defaultExpanded: true },
          { key: 'active-file', heading: 'Active file', alwaysVisible: true, defaultExpanded: false },
        ],
          setAlwaysVisible: vi.fn(),
        }}
      />,
    )

    expect(screen.getByTestId('ide-context-section-active-file')).toHaveAttribute('open')
    expect(requestSection).not.toHaveAttribute('open')
  })

  it('AGENTS.md セクションは表示しない', async () => {
    const user = userEvent.setup()
    const message = buildMessage({
      metadata: {
        ideContext: {
          sections: [
            { heading: 'AGENTS.md', content: 'ルール', defaultExpanded: true },
            { heading: 'My request for Codex', content: 'タスク 9 を実行', defaultExpanded: true },
          ],
        },
      } as Record<string, unknown>,
    })

  renderWithPreference(message, {
    sections: [
      { key: 'my-request-for-codex', heading: 'My request for Codex', alwaysVisible: false, defaultExpanded: true },
    ],
    setAlwaysVisible: vi.fn(),
  })

    await user.click(screen.getByRole('button', { name: /IDE コンテキスト/ }))

    expect(screen.queryByText(/AGENTS\.md/i)).not.toBeInTheDocument()
    expect(screen.getByText('My request for Codex')).toBeInTheDocument()
  })

  it('本文が空でも IDE コンテキストがある場合はプレースホルダーを表示しない', async () => {
    const user = userEvent.setup()
    const message = buildMessage({
      segments: [],
      metadata: {
        ideContext: {
          sections: [
            { heading: 'My request for Codex', content: '/kiro:spec-impl issue-36 10', defaultExpanded: true },
          ],
        },
      } as Record<string, unknown>,
    })

    renderWithPreference(message)

    expect(screen.queryByText('本文はありません。')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /IDE コンテキスト/ }))
    expect(screen.getByTestId('ide-context-section-my-request-for-codex')).toBeInTheDocument()
  })
})

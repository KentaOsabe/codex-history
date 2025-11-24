import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import MessageCard from '../MessageCard'

import type { SessionMessageViewModel } from '../types'

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
      text: 'ユーザー本文',
    },
  ],
  options: overrides?.options,
  toolCall: overrides?.toolCall,
  isEncryptedReasoning: overrides?.isEncryptedReasoning ?? false,
  metadata: overrides?.metadata,
})

describe('MessageCard – ユーザー本文優先レイアウト', () => {
  it('本文を先頭に表示し、その下にオプションを未選択状態で並べる', async () => {
    const user = userEvent.setup()
    const message = buildMessage({
      segments: [
        { id: 'seg-body', channel: 'input', text: 'My request 本文' },
      ],
      options: [
        { id: 'opt-1', label: 'Active file', value: 'frontend/src/App.tsx' },
        { id: 'opt-2', label: 'Open tabs', value: 'SessionDetailPage.tsx' },
      ],
    })

    render(<MessageCard message={message} />)

    expect(screen.getByText('My request 本文')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'オプション' })).toBeInTheDocument()

    const optionCheckboxes = screen.getAllByRole('checkbox')
    expect(optionCheckboxes).toHaveLength(2)
    optionCheckboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked())

    expect(screen.queryByText('frontend/src/App.tsx')).not.toBeInTheDocument()

    await user.click(optionCheckboxes[0])
    expect(optionCheckboxes[0]).toBeChecked()
    expect(await screen.findByText('frontend/src/App.tsx')).toBeInTheDocument()
  })

  it('オプションが存在しない場合はオプションセクションを表示しない', () => {
    render(<MessageCard message={buildMessage({ options: undefined })} />)

    expect(screen.queryByRole('heading', { name: 'オプション' })).not.toBeInTheDocument()
    expect(screen.getByText('ユーザー本文')).toBeInTheDocument()
  })

  it('本文が空でもオプションがあればプレースホルダーを表示しない', () => {
    const message = buildMessage({
      segments: [],
      options: [
        { id: 'opt-1', label: 'Active file', value: 'frontend/src/main.tsx' },
      ],
    })

    render(<MessageCard message={message} />)

    expect(screen.queryByText('本文はありません。')).not.toBeInTheDocument()
    expect(screen.getByText('Active file')).toBeInTheDocument()
  })
})

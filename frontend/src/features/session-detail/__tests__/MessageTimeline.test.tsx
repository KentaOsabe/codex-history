import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import MessageTimeline from '../MessageTimeline'

const buildMessages = () => [
  {
    id: 'msg-1',
    timestampLabel: '2025/3/14 09:00',
    role: 'user' as const,
    sourceType: 'message' as const,
    channel: 'input' as const,
    segments: [
      {
        id: 'seg-1',
        channel: 'input' as const,
        text: 'ユーザー発言',
      },
    ],
    toolCall: undefined,
    isEncryptedReasoning: false,
  },
  {
    id: 'msg-2',
    timestampLabel: '2025/3/14 09:05',
    role: 'assistant' as const,
    sourceType: 'tool_result' as const,
    channel: 'output' as const,
    segments: [],
    toolCall: {
      callId: 'call-1',
      name: 'search_docs',
      argumentsJson: { query: 'rails' },
      resultJson: { hits: 2 },
    },
    isEncryptedReasoning: true,
    encryptedChecksum: 'abcd1234',
    encryptedLength: 128,
  },
]

describe('MessageTimeline', () => {
  it('メッセージカードをロール・タイムスタンプ付きで描画する', () => {
    render(<MessageTimeline messages={buildMessages()} />)

    expect(screen.getByText('ユーザー発言')).toBeInTheDocument()
    expect(screen.getAllByText('Input')).toHaveLength(1)
    expect(screen.getAllByText('Output')).toHaveLength(1)
  })

  it('暗号化 reasoning のプレースホルダーを表示する', () => {
    render(<MessageTimeline messages={buildMessages()} />)

    expect(screen.getByText(/暗号化された reasoning/i)).toBeInTheDocument()
    expect(screen.getByText(/ハッシュ: abcd1234/i)).toBeInTheDocument()
  })

  it('ツール呼び出し詳細を展開できる', () => {
    const messages = buildMessages().map((msg) =>
      msg.toolCall
        ? {
            ...msg,
            isEncryptedReasoning: false,
            segments: [
              {
                id: 'seg-tool',
                channel: 'output' as const,
                text: 'ツール回答',
              },
            ],
          }
        : msg,
    )

    render(<MessageTimeline messages={messages} />)

    const toggle = screen.getByText('search_docs')
    fireEvent.click(toggle)

    expect(screen.getByText(/rails/)).toBeInTheDocument()
  })

  it('メッセージが存在しない場合は空状態を表示する', () => {
    render(<MessageTimeline messages={[]} />)
    expect(screen.getByText('このセッションには表示できるメッセージがありません。')).toBeInTheDocument()
  })
})

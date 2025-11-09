import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const virtualizerMock = vi.hoisted(() => {
  const state = {
    startIndex: 0,
  }

  return {
    state,
    useVirtualizer: vi.fn((options: any) => {
      const count = typeof options.count === 'number' ? options.count : 0
      const windowSize = Math.max(Math.min(count - state.startIndex, 8), 0)
      const size = 120
      const items = Array.from({ length: windowSize }, (_, index) => {
        const actualIndex = state.startIndex + index
        return {
          key: options.getItemKey?.(actualIndex) ?? `virtual-${actualIndex}`,
          index: actualIndex,
          start: actualIndex * size,
          end: (actualIndex + 1) * size,
          size,
          lane: 0,
        }
      })
      return {
        getVirtualItems: () => items,
        getTotalSize: () => count * size,
        measureElement: vi.fn(),
      }
    }),
  }
})

vi.mock('@tanstack/react-virtual', () => virtualizerMock)

beforeEach(() => {
  virtualizerMock.state.startIndex = 0
  virtualizerMock.useVirtualizer.mockClear()
})

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

const buildManyMessages = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `bulk-${index}`,
    timestampLabel: `2025/03/14 09:${String(index).padStart(2, '0')}`,
    role: index % 2 === 0 ? ('assistant' as const) : ('user' as const),
    sourceType: 'message' as const,
    channel: index % 2 === 0 ? ('output' as const) : ('input' as const),
    segments: [
      {
        id: `bulk-seg-${index}`,
        channel: index % 2 === 0 ? ('output' as const) : ('input' as const),
        text: `本文 ${index}`,
      },
    ],
    toolCall: undefined,
    isEncryptedReasoning: false,
  }))

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

  it('ツール呼び出し詳細を展開できる', async () => {
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

    await screen.findByText(/rails/)
  })

  it('メッセージが存在しない場合は空状態を表示する', () => {
    render(<MessageTimeline messages={[]} />)
    expect(screen.getByText('このセッションには表示できるメッセージがありません。')).toBeInTheDocument()
  })

  it('メッセージ数が閾値を超える場合は仮想スクロールで DOM ノード数を抑制する', async () => {
    const manyMessages = buildManyMessages(200)
    const { container } = render(<MessageTimeline messages={manyMessages} />)

    const timeline = container.querySelector('[aria-live="polite"]') as HTMLElement
    expect(timeline).toHaveAttribute('data-virtualized', 'true')

    const renderedCards = await screen.findAllByRole('article')
    expect(renderedCards.length).toBeLessThan(manyMessages.length)
  })

  it('スクロール上端に到達したら追加読み込みフックを呼び出す', () => {
    const manyMessages = buildManyMessages(200)
    const handleReachStart = vi.fn()

    render(<MessageTimeline messages={manyMessages} onReachStart={handleReachStart} />)

    expect(handleReachStart).toHaveBeenCalledTimes(1)
  })

  it('スクロール下端に到達したら追加読み込みフックを呼び出す', () => {
    const manyMessages = buildManyMessages(200)
    const handleReachEnd = vi.fn()
    virtualizerMock.state.startIndex = manyMessages.length - 8

    render(<MessageTimeline messages={manyMessages} onReachEnd={handleReachEnd} />)

    expect(handleReachEnd).toHaveBeenCalledTimes(1)
  })

  it('スクロール操作時にアンカー情報を通知する', () => {
    const handleAnchor = vi.fn()
    const { container } = render(
      <MessageTimeline
        messages={buildMessages()}
        virtualizationThreshold={999}
        onScrollAnchorChange={handleAnchor}
      />,
    )

    const timeline = container.querySelector('[aria-live="polite"]') as HTMLElement
    Object.defineProperty(timeline, 'scrollHeight', { value: 400, configurable: true })
    Object.defineProperty(timeline, 'clientHeight', { value: 200, configurable: true })
    timeline.scrollTop = 100

    fireEvent.scroll(timeline)

    expect(handleAnchor).toHaveBeenCalledWith({ absoluteOffset: 100, offsetRatio: 0.5 })
  })

  it('暗号化 reasoning では生の暗号化本文を DOM に出力しない', () => {
    // 暗号化メッセージに含まれるプレーンテキストが誤って表示されないことを保証する
    const sensitivePayload = '<<ENCRYPTED_PAYLOAD>>'
    const messages = [
      {
        id: 'enc-1',
        timestampLabel: '2025/3/14 09:00',
        role: 'assistant' as const,
        sourceType: 'message' as const,
        channel: 'output' as const,
        segments: [
          {
            id: 'seg-sensitive',
            channel: 'output' as const,
            text: sensitivePayload,
          },
        ],
        toolCall: undefined,
        isEncryptedReasoning: true,
        encryptedChecksum: 'deadbeef',
        encryptedLength: 256,
      },
    ]

    render(<MessageTimeline messages={messages} virtualizationThreshold={999} />)

    expect(screen.getByText(/暗号化された reasoning/)).toBeInTheDocument()
    expect(screen.queryByText(sensitivePayload)).not.toBeInTheDocument()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import MetaEventsPanel from '../MetaEventsPanel'
import type { MetaEventGroup } from '../types'

const SanitizedJsonViewerMock = vi.fn(({ label }: { label: string }) => (
  <div data-testid={`json-${label}`}>{label}ビューア</div>
))

vi.mock('../SanitizedJsonViewer', () => ({
  __esModule: true,
  default: (props: { label: string }) => SanitizedJsonViewerMock(props),
}))

vi.mock('../EncryptedReasoningPlaceholder', () => ({
  __esModule: true,
  default: (props: { checksum?: string }) => (
    <div data-testid="encrypted-placeholder">暗号化: {props.checksum ?? 'unknown'}</div>
  ),
}))

describe('MetaEventsPanel', () => {
  it('メタイベントがない場合はプレースホルダーを表示する (R3)', () => {
    render(<MetaEventsPanel metaEvents={[]} />)

    expect(screen.getByText('メタイベントはまだありません')).toBeInTheDocument()
  })

  it('token_count グループをアコーディオン展開で表示し、JSON ビューアを描画する (R3/R4)', () => {
    const groups: MetaEventGroup[] = [
      {
        key: 'token_count',
        label: 'トークンカウント',
        events: [
          {
            id: 'token-1',
            timestampLabel: '2025/03/14 19:00:00',
            summary: '入力: 120 / 出力: 45 / 合計: 165',
            tokenStats: {
              inputTokens: 120,
              outputTokens: 45,
              totalTokens: 165,
            },
            payloadJson: { kind: 'token_count' },
          },
        ],
      },
    ]

    render(<MetaEventsPanel metaEvents={groups} />)

    const toggle = screen.getByRole('button', { name: /トークンカウント/ })
    fireEvent.click(toggle)

    expect(screen.getByText('入力: 120 / 出力: 45 / 合計: 165')).toBeInTheDocument()
    expect(screen.getByText('入力トークン')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(SanitizedJsonViewerMock).toHaveBeenCalledWith(expect.objectContaining({ label: 'イベントペイロード' }))
  })

  it('agent_reasoning イベントで暗号化プレースホルダーを表示する (R3/R4)', () => {
    const groups: MetaEventGroup[] = [
      {
        key: 'agent_reasoning',
        label: 'Agent Reasoning',
        events: [
          {
            id: 'reasoning-1',
            summary: '暗号化された reasoning',
            encryptedInfo: {
              checksum: 'abc123',
              length: 2048,
            },
          },
        ],
      },
    ]

    render(<MetaEventsPanel metaEvents={groups} />)

    const toggle = screen.getByRole('button', { name: /Agent Reasoning/ })
    fireEvent.click(toggle)

    expect(screen.getByTestId('encrypted-placeholder')).toBeInTheDocument()
  })
})

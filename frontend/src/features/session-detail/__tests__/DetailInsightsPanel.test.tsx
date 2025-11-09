import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import DetailInsightsPanel from '../DetailInsightsPanel'

import type { SessionDetailViewModel } from '../types'

const metaPanelSpy = vi.fn()

vi.mock('../MetaEventsPanel', () => ({
  __esModule: true,
  default: (props: { metaEvents: unknown[]; sessionId?: string }) => {
    metaPanelSpy(props)
    return <div data-testid="meta-panel-mock">MetaEventsPanelMock</div>
  },
}))

vi.mock('../useDetailInsights', () => ({
  useDetailInsights: () => ({
    toolInvocations: [
      {
        id: 'call-1',
        callId: 'call-1',
        name: 'shell',
        status: 'success',
        startedAtLabel: '2025/03/14 09:00:00',
        completedAtLabel: '2025/03/14 09:00:05',
        durationMs: 5000,
      },
    ],
    metaEvents: [
      {
        key: 'token_count',
        label: 'トークンカウント',
        events: [],
      },
    ],
  }),
}))

describe('DetailInsightsPanel', () => {
  beforeEach(() => {
    metaPanelSpy.mockClear()
  })

  it('detail が未定義のときにスケルトンと読み込みメッセージを表示する', () => {
    // データ準備中でもユーザーに進捗を伝えることを保証する
    render(<DetailInsightsPanel detail={undefined} status="loading" />)

    expect(screen.getByTestId('detail-panel-skeleton')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('ツール呼び出しとメタイベントの詳細を読み込み中です')).toBeInTheDocument()
  })

  it('detail が存在するときにツール呼び出しタイムラインを表示する (R2)', () => {
    const detail = {
      sessionId: 'session-1',
      title: 'Session 1',
      variant: 'original',
      sanitizedAvailable: true,
      stats: { messageCount: 0, reasoningCount: 0, toolCallCount: 0, durationSeconds: 0 },
      meta: { relativePath: 'sessions/session-1.jsonl' },
      messages: [],
    } as SessionDetailViewModel

    render(<DetailInsightsPanel detail={detail} status="success" />)

    expect(screen.getByText('ツール呼び出しタイムライン')).toBeInTheDocument()
  })

  it('メタイベントパネルを描画し、集約データを子コンポーネントへ渡す (R3)', () => {
    const detail = {
      sessionId: 'session-2',
      title: 'Session 2',
      variant: 'original',
      sanitizedAvailable: false,
      stats: { messageCount: 0, reasoningCount: 0, toolCallCount: 0, durationSeconds: 0 },
      meta: { relativePath: 'sessions/session-2.jsonl' },
      messages: [],
    } as SessionDetailViewModel

    render(<DetailInsightsPanel detail={detail} status="success" />)

    expect(metaPanelSpy).toHaveBeenCalledWith(expect.objectContaining({ metaEvents: expect.any(Array) }))
    expect(screen.getByTestId('meta-panel-mock')).toBeInTheDocument()
  })
})

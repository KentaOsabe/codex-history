import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MetaEventDrawer from '../MetaEventDrawer'

import type { MetaEventGroup, TimelineBundleSummary, ToolInvocationGroup } from '../types'

const metaPanelMock = vi.fn((props: { payloadMode?: string }) => (
  <div data-testid="meta-panel" data-mode={props.payloadMode ?? 'default'}>
    meta panel
  </div>
))

const toolPanelMock = vi.fn((props: { viewerMode?: string }) => (
  <div data-testid="tool-panel" data-mode={props.viewerMode ?? 'default'}>
    tool panel
  </div>
))

vi.mock('../MetaEventsPanel', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => metaPanelMock(props as { payloadMode?: string }),
}))

vi.mock('../ToolBundlePanel', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => toolPanelMock(props as { viewerMode?: string }),
}))

beforeEach(() => {
  metaPanelMock.mockClear()
  toolPanelMock.mockClear()
})

const summary = (overrides: Partial<TimelineBundleSummary> = {}): TimelineBundleSummary => ({
  id: 'session-1-meta',
  bundleType: overrides.bundleType ?? 'meta',
  label: overrides.label ?? 'メタイベント',
  count: overrides.count ?? 3,
  preview: overrides.preview ?? 'overview',
  anchorMessageId: overrides.anchorMessageId ?? 'meta-1',
  isSanitizedVariant: overrides.isSanitizedVariant ?? false,
})

const metaEvents: MetaEventGroup[] = [
  {
    key: 'token_count',
    label: 'トークンカウント',
    events: [
      {
        id: 'meta-1',
        summary: 'token usage',
        timestampLabel: '2025/03/14 09:00:00',
      },
    ],
  },
]

const toolInvocations: ToolInvocationGroup[] = [
  {
    id: 'tool-1',
    callId: 'call-1',
    name: 'refreshIndex',
    status: 'success',
  },
]

describe('MetaEventDrawer', () => {
  it('サニタイズ variant ではバナーと redacted モードで MetaEventsPanel を描画する (R2.4)', () => {
    const handleClose = vi.fn()
    render(
      <MetaEventDrawer
        open
        onClose={handleClose}
        variant="sanitized"
        placement="side"
        summary={summary({ isSanitizedVariant: true })}
        metaEvents={metaEvents}
        toolInvocations={toolInvocations}
        sessionId="session-1"
      />,
    )

    expect(screen.getByText('サニタイズ版のイベントを表示中')).toBeInTheDocument()
    expect(metaPanelMock).toHaveBeenCalledWith(expect.objectContaining({ payloadMode: 'redacted' }))
    expect(handleClose).not.toHaveBeenCalled()
    expect(toolPanelMock).not.toHaveBeenCalled()
  })

  it('ツール bundle では ToolBundlePanel を表示し閉じるボタンを提供する', () => {
    const handleClose = vi.fn()

    render(
      <MetaEventDrawer
        open
        onClose={handleClose}
        variant="original"
        placement="bottom"
        summary={summary({ bundleType: 'tool', label: 'ツールイベント' })}
        metaEvents={metaEvents}
        toolInvocations={toolInvocations}
        sessionId="session-1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '詳細を閉じる' }))
    expect(toolPanelMock).toHaveBeenCalledWith(expect.objectContaining({ viewerMode: 'default' }))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})

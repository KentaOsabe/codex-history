import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { ResponsiveLayoutState } from '@/features/layout/useResponsiveLayout'

import SessionDetailPage from '../SessionDetailPage'

import type { SessionDetailHookResult } from '../useSessionDetailViewModel'

const useSessionDetailViewModelMock = vi.fn<SessionDetailHookResult, []>()
const responsiveLayoutMock = vi.fn<[], ResponsiveLayoutState>()

vi.mock('../useSessionDetailViewModel', () => ({
  useSessionDetailViewModel: (): SessionDetailHookResult => useSessionDetailViewModelMock(),
}))

vi.mock('@/features/layout/useResponsiveLayout', () => {
  const mockResponsiveLayout = () => responsiveLayoutMock()
  return {
    __esModule: true,
    default: mockResponsiveLayout,
  }
})

const buildDetail = () => ({
  sessionId: 'session-123',
  title: 'Demo Session',
  variant: 'original' as const,
  sanitizedAvailable: true,
  stats: {
    messageCount: 42,
    reasoningCount: 4,
    toolCallCount: 3,
    durationSeconds: 1800,
    completedAtLabel: '2025/3/14 10:00',
  },
  meta: {
    relativePath: '2025/03/14/session-123.jsonl',
    downloadUrl: '/downloads/session-123.jsonl',
    lastUpdatedLabel: '2025/3/14 10:05',
  },
  messages: [
    {
      id: 'msg-1',
      timestampLabel: '2025/3/14 09:00',
      role: 'user',
      sourceType: 'message',
      channel: 'input',
      segments: [
        {
          id: 'msg-1-seg-1',
          channel: 'input',
          text: 'ユーザーの質問',
        },
      ],
      toolCall: undefined,
      isEncryptedReasoning: false,
    },
    {
      id: 'msg-2',
      timestampLabel: '2025/3/14 09:05',
      role: 'assistant',
      sourceType: 'tool_result',
      channel: 'output',
      segments: [
        {
          id: 'msg-2-seg-1',
          channel: 'output',
          text: '検索ツールからの回答です。',
        },
      ],
      toolCall: {
        callId: 'call-1',
        name: 'search_docs',
        argumentsJson: { query: 'rails' },
        resultJson: { hits: 3 },
      },
      isEncryptedReasoning: false,
    },
  ],
})

const defaultLayout: ResponsiveLayoutState = {
  breakpoint: 'lg',
  columns: 2,
  isStackedPanels: false,
}

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={[ '/sessions/session-123' ]}>
      <Routes>
        <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SessionDetailPage', () => {
  beforeEach(() => {
    useSessionDetailViewModelMock.mockReset()
    responsiveLayoutMock.mockReset()
    responsiveLayoutMock.mockReturnValue(defaultLayout)
  })

  it('詳細情報のヘッダー・統計・ダウンロードリンクを表示する', () => {
    const setVariantMock = vi.fn()
    const preserveAnchorMock = vi.fn()
    useSessionDetailViewModelMock.mockReturnValue({
      status: 'success',
      detail: buildDetail(),
      error: undefined,
      variant: 'original',
      hasSanitizedVariant: true,
      setVariant: setVariantMock,
      refetch: vi.fn(),
      preserveScrollAnchor: preserveAnchorMock,
      consumeScrollAnchor: vi.fn(),
    })

    renderPage()

    expect(screen.getByRole('heading', { name: 'Demo Session' })).toBeInTheDocument()
    expect(screen.getByText('メッセージ数')).toBeInTheDocument()
    expect(screen.getByText('ツール呼び出し')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'JSON をダウンロード' })).toHaveAttribute(
      'href',
      '/downloads/session-123.jsonl',
    )
    expect(screen.getByText('ユーザーの質問')).toBeInTheDocument()
    expect(screen.getByText('検索ツールからの回答です。')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'サニタイズ済み' }))
    expect(setVariantMock).toHaveBeenCalledWith('sanitized')
    expect(preserveAnchorMock).toHaveBeenCalled()
  })

  it('サニタイズ版が利用できない場合は切替ボタンを無効化する', () => {
    const setVariantMock = vi.fn()
    const detail = buildDetail()
    detail.sanitizedAvailable = false
    useSessionDetailViewModelMock.mockReturnValue({
      status: 'success',
      detail,
      error: undefined,
      variant: 'original',
      hasSanitizedVariant: false,
      setVariant: setVariantMock,
      refetch: vi.fn(),
      preserveScrollAnchor: vi.fn(),
      consumeScrollAnchor: vi.fn(),
    })

    renderPage()

    const sanitizedButton = screen.getByRole('button', { name: 'サニタイズ済み' })
    expect(sanitizedButton).toBeDisabled()
    fireEvent.click(sanitizedButton)
    expect(setVariantMock).not.toHaveBeenCalled()
  })

  it('エラー時にアラートとリトライを表示する', () => {
    const refetchMock = vi.fn().mockResolvedValue(undefined)
    useSessionDetailViewModelMock.mockReturnValue({
      status: 'error',
      detail: undefined,
      error: { kind: 'server', message: '取得に失敗しました' },
      variant: 'original',
      hasSanitizedVariant: false,
      setVariant: vi.fn(),
      refetch: refetchMock,
      preserveScrollAnchor: vi.fn(),
      consumeScrollAnchor: vi.fn(),
    })

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('取得に失敗しました')
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }))
    expect(refetchMock).toHaveBeenCalled()
  })

  it('xsレイアウトでは会話領域が先頭に描画され、サマリーは折りたたみに格納される', () => {
    responsiveLayoutMock.mockReturnValue({ breakpoint: 'xs', columns: 1, isStackedPanels: true })
    useSessionDetailViewModelMock.mockReturnValue({
      status: 'success',
      detail: buildDetail(),
      error: undefined,
      variant: 'original',
      hasSanitizedVariant: true,
      setVariant: vi.fn(),
      refetch: vi.fn(),
      preserveScrollAnchor: vi.fn(),
      consumeScrollAnchor: vi.fn(),
    })

    renderPage()

    const grid = screen.getByTestId('session-detail-grid')
    const conversationRegion = screen.getByTestId('conversation-region')
    expect(grid.firstElementChild).toBe(conversationRegion)

    const accordion = screen.getByTestId('session-summary-accordion')
    expect(accordion).not.toHaveAttribute('open')
  })

  it('lgレイアウトではサマリーが補助ランドマークとして常時表示される', () => {
    responsiveLayoutMock.mockReturnValue({ breakpoint: 'lg', columns: 2, isStackedPanels: false })
    useSessionDetailViewModelMock.mockReturnValue({
      status: 'success',
      detail: buildDetail(),
      error: undefined,
      variant: 'original',
      hasSanitizedVariant: true,
      setVariant: vi.fn(),
      refetch: vi.fn(),
      preserveScrollAnchor: vi.fn(),
      consumeScrollAnchor: vi.fn(),
    })

    renderPage()

    expect(screen.queryByTestId('session-summary-accordion')).toBeNull()
    const summaryRail = screen.getByRole('complementary', { name: 'セッション概要' })
    expect(summaryRail).toHaveAttribute('data-testid', 'session-summary-rail')
  })
})

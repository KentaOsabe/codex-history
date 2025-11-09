import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import SessionDetailPage from '../SessionDetailPage'

import type { SessionDetailHookResult } from '../useSessionDetailViewModel'

const useSessionDetailViewModelMock = vi.fn<SessionDetailHookResult, []>()

vi.mock('../useSessionDetailViewModel', () => ({
  useSessionDetailViewModel: (): SessionDetailHookResult => useSessionDetailViewModelMock(),
}))

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
})

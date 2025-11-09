import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { forwardRef, useEffect } from 'react'

import type { SessionDetailResponse } from '@/api/types/sessions'
import { server } from '@/api/testServer'

import SessionDetailPage from '../SessionDetailPage'

vi.mock('../MessageTimeline', () => {
  const MockTimeline = forwardRef<HTMLDivElement, any>(({ messages, onScrollAnchorChange }, ref) => {
    useEffect(() => {
      onScrollAnchorChange?.({ offsetRatio: 0, absoluteOffset: 0 })
    }, [onScrollAnchorChange])

    return (
      <div
        ref={ref}
        data-testid="message-timeline"
        data-virtualized={messages.length > 120 ? 'true' : 'false'}
      >
        {messages.map((message: any) => (
          <article key={message.id}>{message.segments[0]?.text ?? '本文なし。'}</article>
        ))}
      </div>
    )
  })

  MockTimeline.displayName = 'MockMessageTimeline'

  return {
    __esModule: true,
    default: MockTimeline,
  }
})

const buildMessages = (count: number, prefix: string): SessionDetailResponse['data']['attributes']['messages'] => {
  return Array.from({ length: count }, (_, index) => {
    const role = index % 2 === 0 ? 'assistant' : 'user'
    const channel = role === 'assistant' ? 'output' : 'input'
    return {
      id: `${prefix}-${index}`,
      timestamp: `2025-03-14T09:${String(index).padStart(2, '0')}:00Z`,
      source_type: 'message' as const,
      role,
      segments: [
        {
          channel,
          type: 'text' as const,
          format: 'plain',
          text: `${prefix} #${index}`,
        },
      ],
      raw: {
        payload_type: 'default',
      },
    }
  })
}

const buildSessionDetailResponse = (options: {
  attributes?: Partial<SessionDetailResponse['data']['attributes']>
  messages?: SessionDetailResponse['data']['attributes']['messages']
} = {}): SessionDetailResponse => {
  const messages = options.messages ?? buildMessages(4, 'メッセージ')

  const attributes: SessionDetailResponse['data']['attributes'] = {
    session_id: options.attributes?.session_id ?? 'session-123',
    title: options.attributes?.title ?? 'Session Detail',
    relative_path: options.attributes?.relative_path ?? '2025/03/14/session-123.jsonl',
    created_at: options.attributes?.created_at ?? '2025-03-14T09:00:00Z',
    completed_at: options.attributes?.completed_at ?? '2025-03-14T10:00:00Z',
    duration_seconds: options.attributes?.duration_seconds ?? 3600,
    message_count: options.attributes?.message_count ?? messages.length,
    tool_call_count: options.attributes?.tool_call_count ?? 2,
    tool_result_count: options.attributes?.tool_result_count ?? 2,
    reasoning_count: options.attributes?.reasoning_count ?? 1,
    meta_event_count: options.attributes?.meta_event_count ?? 0,
    has_sanitized_variant: options.attributes?.has_sanitized_variant ?? true,
    speaker_roles: options.attributes?.speaker_roles ?? [ 'user', 'assistant' ],
    checksum_sha256: options.attributes?.checksum_sha256 ?? 'abc',
    signature: options.attributes?.signature ?? 'sig',
    messages,
  }

  return {
    data: {
      id: attributes.session_id,
      type: 'session',
      attributes,
    },
    meta: {
      session: {
        relative_path: attributes.relative_path,
        raw_session_meta: {
          updated_at: '2025-03-14T10:30:00Z',
        },
      },
      links: {
        download: `/downloads/${attributes.session_id}.jsonl`,
      },
    },
    errors: [],
  }
}

const renderDetailPage = () => {
  return render(
    <MemoryRouter initialEntries={[ '/sessions/session-123' ]}>
      <Routes>
        <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SessionDetailPage (integration)', () => {
  it('詳細を取得しサニタイズ切替時もスクロール位置と仮想スクロール状態を維持する', async () => {
    // 大量メッセージで仮想スクロールが有効な環境でも、variant 切替後にアンカーが再現されることを保証する
    const requestLog: string[] = []

    server.use(
      http.get('*/api/sessions/:sessionId', ({ request, params }) => {
        const url = new URL(request.url)
        const variant = (url.searchParams.get('variant') ?? 'original') as 'original' | 'sanitized'
        requestLog.push(variant)
        const title = variant === 'sanitized' ? 'Sanitized Session' : 'Original Session'
        const messages = buildMessages(160, variant === 'sanitized' ? 'サニタイズ済み' : 'オリジナル')

        return HttpResponse.json(
          buildSessionDetailResponse({
            attributes: {
              session_id: params.sessionId as string,
              title,
              has_sanitized_variant: true,
            },
            messages,
          }),
        )
      }),
    )

    renderDetailPage()

    await waitFor(() => {
      expect(requestLog).toHaveLength(1)
    }, { timeout: 3000 })

    await screen.findByRole('heading', { name: 'Original Session' }, { timeout: 5000 })

    await waitFor(() => {
      expect(screen.getByTestId('message-timeline')).toBeInTheDocument()
    }, { timeout: 3000 })

    const timeline = screen.getByTestId('message-timeline') as HTMLDivElement
    expect(timeline).toHaveAttribute('data-virtualized', 'true')

    Object.defineProperty(timeline, 'clientHeight', { value: 400, configurable: true })
    Object.defineProperty(timeline, 'scrollHeight', { value: 2000, configurable: true })

    timeline.scrollTop = 600
    fireEvent.scroll(timeline)

    fireEvent.click(screen.getByRole('button', { name: 'サニタイズ済み' }))

    await waitFor(() => {
      expect(requestLog).toHaveLength(2)
    }, { timeout: 3000 })

    await screen.findByRole('heading', { name: 'Sanitized Session' }, { timeout: 5000 })

    await waitFor(() => {
      expect(Math.round(timeline.scrollTop)).toBe(600)
    }, { timeout: 3000 })

    expect(requestLog).toEqual([ 'original', 'sanitized' ])
  })

  it('API 404 を受け取った場合にエラーバナーとリトライ導線を表示する', async () => {
    // 存在しないセッション ID でも利用者にエラー理由と復帰手段を提示することを保証する
    server.use(
      http.get('*/api/sessions/:sessionId', () => {
        return HttpResponse.json(
          {
            data: null,
            errors: [
              {
                status: '404',
                code: 'not_found',
                title: 'Not Found',
                detail: 'Session not found',
              },
            ],
            meta: {},
          },
          { status: 404 },
        )
      }),
    )

    renderDetailPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('HTTP 404')
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument()
  })

  it('サーバーエラー後に再読み込みで成功レスポンスへ回復する', async () => {
    // 一時的な 500 応答でもユーザー操作で即座に再取得できることを保証する
    let attempt = 0

    server.use(
      http.get('*/api/sessions/:sessionId', () => {
        attempt += 1
        if (attempt <= 2) {
          return HttpResponse.json(
            {
              data: null,
              errors: [
                {
                  status: '500',
                  code: 'server_error',
                  title: 'Server error',
                  detail: 'Temporary failure',
                },
              ],
              meta: {},
            },
            { status: 500 },
          )
        }

        return HttpResponse.json(
          buildSessionDetailResponse({
            attributes: {
              title: 'Recovered Session',
            },
          }),
        )
      }),
    )

    renderDetailPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500')

    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Recovered Session' })).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(attempt).toBe(3)
  })
})

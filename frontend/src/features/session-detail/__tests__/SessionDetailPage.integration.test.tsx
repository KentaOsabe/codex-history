import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { forwardRef, useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { server } from '@/api/testServer'
import type { SessionDetailResponse, SessionVariant } from '@/api/types/sessions'

import SessionDetailPage from '../SessionDetailPage'

interface MockTimelineProps {
  messages: SessionDetailResponse['data']['attributes']['messages']
  virtualizationThreshold?: number
  onScrollAnchorChange?: (snapshot: { offsetRatio: number; absoluteOffset: number }) => void
  highlightedIds?: string[]
  canLoadPrev?: boolean
  canLoadNext?: boolean
  onRequestLoad?: (direction: 'prev' | 'next') => void
  displayMode?: 'conversation' | 'full'
}

vi.mock('../MessageTimeline', () => {
  const MockTimeline = forwardRef<HTMLDivElement, MockTimelineProps>((props, ref) => {
    const { messages, onScrollAnchorChange, highlightedIds, canLoadNext, canLoadPrev, onRequestLoad } = props

    useEffect(() => {
      onScrollAnchorChange?.({ offsetRatio: 0, absoluteOffset: 0 })
    }, [onScrollAnchorChange])

    const handleRequestLoad = () => {
      if (!onRequestLoad) {
        return
      }
      onRequestLoad('next')
    }

    return (
      <div
        ref={ref}
        data-testid="message-timeline"
        data-virtualized={messages.length > 120 ? 'true' : 'false'}
        data-highlighted-count={highlightedIds?.length ?? 0}
        data-can-load-prev={canLoadPrev ? 'true' : 'false'}
        data-can-load-next={canLoadNext ? 'true' : 'false'}
        data-has-request={onRequestLoad ? 'true' : 'false'}
        data-display-mode={props.displayMode ?? 'full'}
      >
        <button type="button" data-testid="mock-timeline-request-load" onClick={handleRequestLoad}>
          load-more
        </button>
        {messages.map((message) => {
          const highlighted = highlightedIds?.includes(message.id)
          const hasIdeContext = Boolean((message as { metadata?: { ideContext?: { sections?: unknown[] } } }).metadata?.ideContext?.sections?.length)
          const primaryText = message.segments[0]?.text
          const bodyText = typeof primaryText === 'string' ? primaryText : hasIdeContext ? '' : '本文なし。'
          return (
            <article key={message.id} data-message-id={message.id} data-highlighted={highlighted ? 'true' : 'false'}>
              {bodyText}
            </article>
          )
        })}
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

const buildDetailMessagesForVariant = (
  variant: SessionVariant,
): SessionDetailResponse['data']['attributes']['messages'] => {
  const callId = 'tool-call-123'
  const variantLabel = variant === 'sanitized' ? 'Sanitized' : 'Original'

  return [
    {
      id: 'message-tool-call',
      timestamp: '2025-03-14T09:00:00Z',
      source_type: 'tool_call' as const,
      role: 'assistant' as const,
      segments: [
        {
          channel: 'output' as const,
          type: 'text' as const,
          format: 'plain',
          text: `${variantLabel} tool call`,
        },
      ],
      tool_call: {
        call_id: callId,
        name: variant === 'sanitized' ? 'safe-run (sanitized)' : 'safe-run',
        arguments_json: {
          sql: `SELECT * FROM logs -- ${variantLabel}`,
          html: `<script>alert('${variantLabel}')</script><a href="javascript:alert('${variantLabel}')">link</a>`,
        },
        status: 'completed',
      },
      raw: {
        payload_type: 'function_call',
      },
    },
    {
      id: 'message-tool-result',
      timestamp: '2025-03-14T09:00:05Z',
      source_type: 'tool_result' as const,
      role: 'tool' as const,
      segments: [
        {
          channel: 'meta' as const,
          type: 'text' as const,
          format: 'plain',
          text: `${variantLabel} tool result`,
        },
      ],
      tool_result: {
        call_id: callId,
        output_json: {
          ok: true,
          render: `<span onmouseover="alert('${variantLabel}')">${variantLabel}</span>`,
        },
      },
    },
    {
      id: 'message-meta-token',
      timestamp: '2025-03-14T09:01:00Z',
      source_type: 'meta' as const,
      role: 'meta' as const,
      segments: [
        {
          channel: 'meta' as const,
          type: 'text' as const,
          format: 'plain',
          text: `${variantLabel} token usage`,
        },
      ],
      raw: {
        payload_type: 'token_count',
        payload: {
          kind: 'token_count',
          info: {
            prompt_tokens: variant === 'sanitized' ? 90 : 120,
            completion_tokens: 30,
          },
          extra: `<img src="x" onerror="alert('${variantLabel}')">`,
        },
      },
    },
  ]
}

describe('SessionDetailPage (integration)', () => {
  it('会話/詳細タブのアクセシビリティ要件を満たし、詳細タブ切替時にプレースホルダーを表示する', async () => {
    // タブ UI の ARIA 属性とフォーカス移動・ライブアナウンスが満たされることを保証する
    server.use(
      http.get('*/api/sessions/:sessionId', () => {
        return HttpResponse.json(buildSessionDetailResponse())
      }),
    )

    renderDetailPage()

    const conversationTab = await screen.findByRole('tab', { name: '会話' })
    const detailsTab = screen.getByRole('tab', { name: '詳細' })

    expect(conversationTab).toHaveAttribute('aria-selected', 'true')
    expect(detailsTab).toHaveAttribute('aria-selected', 'false')

    const conversationPanel = screen.getByTestId('conversation-tab-panel')
    const detailPanel = screen.getByTestId('details-tab-panel')

    expect(conversationPanel).not.toHaveAttribute('hidden')
    expect(detailPanel).toHaveAttribute('hidden')

    fireEvent.keyDown(conversationTab, { key: 'ArrowRight' })

    await waitFor(() => {
      expect(detailsTab).toHaveAttribute('aria-selected', 'true')
    })

    expect(conversationPanel).toHaveAttribute('hidden')
    expect(detailPanel).not.toHaveAttribute('hidden')
    expect(await screen.findByText('ツール呼び出しイベントはまだありません')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.activeElement).toBe(detailPanel)
    })

    const announcement = screen.getByTestId('session-tab-announcement')
    expect(announcement).toHaveTextContent('詳細タブを表示しています')
  })

  it('初期表示は会話のみでフィルタ UI を畳み、詳細表示ボタンでメタイベントを露出する', async () => {
    const messages: SessionDetailResponse['data']['attributes']['messages'] = [
      {
        id: 'user-1',
        timestamp: '2025-03-14T09:00:00Z',
        source_type: 'message',
        role: 'user',
        segments: [
          {
            channel: 'input',
            type: 'text',
            format: 'plain',
            text: 'ユーザーの質問',
          },
        ],
        raw: { payload_type: 'default' },
      },
      {
        id: 'assistant-1',
        timestamp: '2025-03-14T09:01:00Z',
        source_type: 'message',
        role: 'assistant',
        segments: [
          {
            channel: 'output',
            type: 'text',
            format: 'plain',
            text: '回答',
          },
        ],
        raw: { payload_type: 'default' },
      },
      ...buildDetailMessagesForVariant('original'),
    ]

    server.use(
      http.get('*/api/sessions/:sessionId', () => {
        return HttpResponse.json(
          buildSessionDetailResponse({
            attributes: {
              message_count: messages.length,
              tool_call_count: 1,
              tool_result_count: 1,
              meta_event_count: 1,
            },
            messages,
          }),
        )
      }),
    )

    renderDetailPage()

    const filterBar = await screen.findByTestId('timeline-filter-bar')
    expect(filterBar).toHaveAttribute('data-collapsed', 'true')
    expect(screen.queryByText(/非表示/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /メタイベント/ })).not.toBeInTheDocument()

    const timeline = await screen.findByTestId('message-timeline')
    const idsBefore = within(timeline).getAllByRole('article').map((node) => node.getAttribute('data-message-id'))
    expect(idsBefore).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: '詳細表示に切り替え' }))

    await waitFor(() => expect(filterBar).toHaveAttribute('data-collapsed', 'false'))
    await waitFor(() => expect(within(timeline).getAllByRole('article')).toHaveLength(messages.length))
    expect(screen.getByText('非表示 3 件')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /メタイベント/ })).toBeInTheDocument()
  })

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

    const timeline = screen.getByTestId('message-timeline')
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

  it('call_id 集約タイムラインで JSON 展開状態とアクティブタブを variant 切替後も保持する (R1/R2/R4/R5)', async () => {
    // 詳細タブで展開したツール呼び出しとメタイベントのビューア、およびサニタイズ警告が variant 切替直後も維持されることを保証する
    const variantRequests: SessionVariant[] = []

    server.use(
      http.get('*/api/sessions/:sessionId', ({ request, params }) => {
        const url = new URL(request.url)
        const variant = (url.searchParams.get('variant') ?? 'original') as SessionVariant
        variantRequests.push(variant)

        return HttpResponse.json(
          buildSessionDetailResponse({
            attributes: {
              session_id: params.sessionId as string,
              title: variant === 'sanitized' ? 'Sanitized Detail' : 'Original Detail',
              message_count: 3,
              tool_call_count: 1,
              tool_result_count: 1,
              meta_event_count: 1,
            },
            messages: buildDetailMessagesForVariant(variant),
          }),
        )
      }),
    )

    renderDetailPage()

    await screen.findByRole('heading', { name: 'Original Detail' }, { timeout: 5000 })

    const detailsTab = screen.getByRole('tab', { name: '詳細' })
    fireEvent.click(detailsTab)

    await screen.findByTestId('tool-invocation-timeline')

    expect(screen.getAllByText('Call ID:')).toHaveLength(1)

    const argsToggle = await screen.findByRole('button', { name: '引数を展開' })
    fireEvent.click(argsToggle)

    const metaToggle = screen.getByRole('button', { name: /トークンカウント/ })
    if (metaToggle.getAttribute('aria-expanded') === 'false') {
      fireEvent.click(metaToggle)
    }

    const payloadToggle = await screen.findByRole('button', { name: 'イベントペイロードを展開' })
    fireEvent.click(payloadToggle)

    const warningsBefore = await screen.findAllByText('安全のため一部の内容をマスクしました')
    expect(warningsBefore.length).toBeGreaterThanOrEqual(2)

    await screen.findByRole('button', { name: '引数を折りたたむ' })
    await screen.findByRole('button', { name: 'イベントペイロードを折りたたむ' })

    fireEvent.click(screen.getByRole('button', { name: 'サニタイズ済み' }))

    await screen.findByRole('heading', { name: 'Sanitized Detail' }, { timeout: 5000 })

    const detailsTabAfter = screen.getByRole('tab', { name: '詳細' })
    expect(detailsTabAfter).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('conversation-tab-panel')).toHaveAttribute('hidden')
    expect(screen.getByTestId('details-tab-panel')).not.toHaveAttribute('hidden')

    await screen.findByRole('button', { name: '引数を折りたたむ' })
    await screen.findByRole('button', { name: 'イベントペイロードを折りたたむ' })

    const warningsAfter = screen.getAllByText('安全のため一部の内容をマスクしました')
    expect(warningsAfter.length).toBeGreaterThanOrEqual(2)
    expect(variantRequests).toEqual([ 'original', 'sanitized' ])
  })

  it('meta / tool サマリーピルから drawer を開きタイムラインの関連メッセージをハイライトする (R2.2/R2.3)', async () => {
    server.use(
      http.get('*/api/sessions/:sessionId', () => {
        return HttpResponse.json(
          buildSessionDetailResponse({
            attributes: {
              session_id: 'session-highlight',
              tool_call_count: 2,
              tool_result_count: 1,
              meta_event_count: 1,
            },
            messages: buildDetailMessagesForVariant('original'),
          }),
        )
      }),
    )

    renderDetailPage()

    fireEvent.click(await screen.findByRole('button', { name: '詳細表示に切り替え' }))

    const bundleButton = await screen.findByRole('button', { name: /メタイベント/ })
    fireEvent.click(bundleButton)

    const drawer = await screen.findByRole('dialog', { name: /メタイベント/ })
    expect(drawer).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('message-timeline').getAttribute('data-highlighted-count')).toBe('1')
    })

    fireEvent.click(screen.getByRole('button', { name: '詳細を閉じる' }))

    await waitFor(() => {
      expect(screen.getByTestId('message-timeline').getAttribute('data-highlighted-count')).toBe('0')
    })
  })

  it('追加ロード中もタイムライン DOM を維持し空白化を防ぐ (R3.2)', async () => {
    let requestCount = 0
    let resolveSecond: ((response: SessionDetailResponse) => void) | null = null

    server.use(
      http.get('*/api/sessions/:sessionId', () => {
        requestCount += 1
        if (requestCount === 1) {
          return HttpResponse.json(
            buildSessionDetailResponse({
              attributes: {
                session_id: 'session-123',
                message_count: 320,
              },
              messages: buildMessages(180, '追加ロード'),
            }),
          )
        }

        if (requestCount === 2) {
          return new Promise((resolve) => {
            resolveSecond = (response) => resolve(HttpResponse.json(response))
          })
        }

        return HttpResponse.json(
          buildSessionDetailResponse({
            attributes: {
              session_id: 'session-123',
              message_count: 320,
            },
            messages: buildMessages(180, '追加ロード'),
          }),
        )
      }),
    )

    renderDetailPage()

    const timeline = await screen.findByTestId('message-timeline')

    await waitFor(() => {
      expect(timeline.getAttribute('data-can-load-next')).toBe('true')
      expect(timeline.getAttribute('data-has-request')).toBe('true')
    })

    fireEvent.click(screen.getByTestId('mock-timeline-request-load'))

    await waitFor(() => {
      expect(requestCount).toBe(2)
    })

    const visibleMessages = screen.getAllByRole('article')
    expect(visibleMessages.length).toBeGreaterThan(0)

    expect(screen.queryByTestId('detail-panel-skeleton')).not.toBeInTheDocument()

    resolveSecond?.(
      buildSessionDetailResponse({
        attributes: {
          session_id: 'session-123',
          message_count: 320,
        },
        messages: buildMessages(200, '追加ロード完了'),
      }),
    )

    await waitFor(() => {
      expect(screen.getAllByRole('article')[0]).toHaveTextContent('追加ロード完了 #0')
    })
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

  it('ユーザー入力が IDE コンテキストのみの場合でも本文プレースホルダーと environment_context を表示しない', async () => {
    server.use(
      http.get('*/api/sessions/:sessionId', () => {
        return HttpResponse.json(
          buildSessionDetailResponse({
            attributes: {
              message_count: 1,
              meta_event_count: 0,
              tool_call_count: 0,
              tool_result_count: 0,
            },
            messages: [
              {
                id: 'user-ide-only',
                timestamp: '2025-03-14T09:00:00Z',
                source_type: 'message',
                role: 'user',
                segments: [
                  {
                    channel: 'input',
                    type: 'text',
                    format: 'markdown',
                    text: `<environment_context>
OS: macOS
</environment_context>

# Context from my IDE setup

## My request for Codex
/kiro:spec-impl issue-36 10`,
                  },
                ],
              },
            ],
          }),
        )
      }),
    )

    renderDetailPage()

    const timeline = await screen.findByTestId('message-timeline')
    const articles = within(timeline).getAllByRole('article')
    expect(articles).toHaveLength(1)
    expect(articles[0]?.textContent?.trim()).toBe('')
    expect(timeline.textContent).not.toMatch(/本文なし。/)
    expect(timeline.textContent).not.toMatch(/environment_context/i)
  })
})

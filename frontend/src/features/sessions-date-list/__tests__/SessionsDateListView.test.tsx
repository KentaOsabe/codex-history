import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/api/testServer'

import SessionsDateListView from '../SessionsDateListView'

const { navigateToSessionDetailMock } = vi.hoisted(() => ({
  navigateToSessionDetailMock: vi.fn(),
}))

vi.mock('../navigation', () => ({
  useSessionNavigation: () => ({
    navigateToSessionDetail: navigateToSessionDetailMock,
  }),
}))

const buildSessionsResponse = (overrides: Partial<Record<string, unknown>> = {}) => ({
  data: [
    {
      id: 'session-1',
      type: 'session',
      attributes: {
        session_id: 'session-1',
        title: 'フィルタ済みセッション',
        relative_path: '2025/03/14/session-1.jsonl',
        created_at: '2025-03-14T09:00:00Z',
        completed_at: '2025-03-14T10:00:00Z',
        duration_seconds: 3600,
        message_count: 58,
        tool_call_count: 4,
        tool_result_count: 4,
        reasoning_count: 0,
        meta_event_count: 0,
        has_sanitized_variant: true,
        speaker_roles: ['user', 'assistant'],
        raw_session_meta: {
          summary: 'サマリーです',
        },
        ...overrides,
      },
    },
  ],
  meta: {
    page: 1,
    per_page: 25,
    total_pages: 1,
    total_count: 1,
    filters: {
      start_date: '2025-03-14',
      end_date: '2025-03-20',
    },
    index: {
      updated_at: '2025-03-14T10:30:00Z',
    },
  },
  errors: [],
})

const buildSearchResponse = (overrides: Partial<Record<string, unknown>> = {}) => ({
  data: [
    {
      id: 'search-hit-1',
      type: 'search_result',
      attributes: {
        session_id: 'session-99',
        scope: 'chat_messages',
        highlight: 'ログ内で <mark>history</mark> を検出',
        occurred_at: '2025-03-20T11:00:00Z',
        message_role: 'assistant',
        message_id: 'message-1',
        relative_path: '2025/03/20/session-99.jsonl',
        occurrence_index: 1,
      },
      links: {
        session: '/sessions/session-99',
      },
    },
  ],
  meta: {
    pagination: {
      page: 1,
      limit: 25,
      total_count: 1,
      total_pages: 2,
    },
    filters: {
      keyword: 'history',
      scope: 'chat_messages',
    },
  },
  errors: [],
  ...overrides,
})

describe('SessionsDateListView (integration)', () => {
  const searchRequests: URLSearchParams[] = []
  const sessionRequests: URLSearchParams[] = []

  beforeEach(() => {
    navigateToSessionDetailMock.mockReset()
    searchRequests.length = 0
    sessionRequests.length = 0

    server.use(
      http.get('/api/sessions', ({ request }) => {
        const url = new URL(request.url)
        sessionRequests.push(url.searchParams)
        return HttpResponse.json(buildSessionsResponse())
      }),
      http.get('/api/search', ({ request }) => {
        const url = new URL(request.url)
        searchRequests.push(url.searchParams)
        return HttpResponse.json(buildSearchResponse())
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('検索キーワード送信で search API を呼び出し、結果カードから詳細遷移できる', async () => {
    // 目的: 検索→結果表示→ページング→ナビゲーションの一連フローを保証する
    const user = userEvent.setup()

    render(<SessionsDateListView />)

    await user.type(screen.getByPlaceholderText('キーワードで検索'), ' history ')
    await user.click(screen.getByRole('button', { name: '検索を実行' }))

    expect(await screen.findByText('session-99')).toBeInTheDocument()
    expect(screen.getByText('検索ヒット 1 件')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '検索結果を次のページへ' }))

    await waitFor(() => {
      expect(searchRequests.at(-1)?.get('page')).toBe('2')
    })

    fireEvent.click(screen.getByRole('button', { name: 'session-99 を開く' }))
    expect(navigateToSessionDetailMock).toHaveBeenCalledWith('session-99', { targetPath: '/sessions/session-99' })
    expect(searchRequests[0]?.get('keyword')).toBe('history')
  })

  it('日付範囲を更新すると sessions API が start/end パラメータ付きで呼ばれる', async () => {
    // 目的: DateRangePicker の入力が API クエリへ反映されることを確認する
    const user = userEvent.setup()

    render(<SessionsDateListView />)

    await user.clear(screen.getByLabelText('開始日'))
    await user.type(screen.getByLabelText('開始日'), '2025-03-10')
    await user.clear(screen.getByLabelText('終了日'))
    await user.type(screen.getByLabelText('終了日'), '2025-03-12')

    await waitFor(() => {
      const params = sessionRequests.at(-1)
      expect(params?.get('start_date')).toBe('2025-03-10')
      expect(params?.get('end_date')).toBe('2025-03-12')
    })
  })

  it('検索結果が0件の場合に空状態メッセージを表示する', async () => {
    // 目的: ゼロ件時に要件どおりのコピーとヒントが表示されることを検証する
    server.use(
      http.get('/api/search', ({ request }) => {
        const url = new URL(request.url)
        searchRequests.push(url.searchParams)
        return HttpResponse.json(
          buildSearchResponse({
            data: [],
            meta: {
              pagination: {
                page: 1,
                limit: 25,
                total_count: 0,
                total_pages: 0,
              },
              filters: {
                keyword: 'history',
                scope: 'chat_messages',
              },
            },
          }),
        )
      }),
    )

    const user = userEvent.setup()
    render(<SessionsDateListView />)

    await user.type(screen.getByPlaceholderText('キーワードで検索'), 'history')
    await user.click(screen.getByRole('button', { name: '検索を実行' }))

    expect(await screen.findByText('該当する会話が見つかりません')).toBeInTheDocument()
    expect(screen.getByText('フィルタ条件を見直すか、別のキーワードを試してください。')).toBeInTheDocument()
  })

  it('検索エラー後に再試行すると成功レスポンスへ復帰する', async () => {
    // 目的: エラー時にもバナーで状況を把握し再試行で回復できる
    let attempt = 0
    server.use(
      http.get('/api/search', ({ request }) => {
        attempt += 1
        const url = new URL(request.url)
        searchRequests.push(url.searchParams)
        if (attempt <= 2) {
          return HttpResponse.json(
            {
              errors: [
                {
                  status: '500',
                  title: 'error',
                  detail: 'temporary',
                },
              ],
            },
            { status: 500 },
          )
        }
        return HttpResponse.json(buildSearchResponse())
      }),
    )

    const user = userEvent.setup()
    render(<SessionsDateListView />)

    await user.type(screen.getByPlaceholderText('キーワードで検索'), 'history')
    await user.click(screen.getByRole('button', { name: '検索を実行' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500')

    fireEvent.click(screen.getByRole('button', { name: 'もう一度試す' }))

    await waitFor(() => {
      expect(searchRequests.length).toBeGreaterThan(1)
    })

    const cards = await screen.findAllByText('session-99')
    expect(cards.length).toBeGreaterThan(0)
    expect(attempt).toBe(3)
  })
})

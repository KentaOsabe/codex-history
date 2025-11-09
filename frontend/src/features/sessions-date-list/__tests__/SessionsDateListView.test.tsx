import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/api/testServer'

import { toISODate } from '../dateUtils'
import SessionsDateListView from '../SessionsDateListView'

const { navigateToSessionDetailMock } = vi.hoisted(() => ({
  navigateToSessionDetailMock: vi.fn(),
}))

vi.mock('../navigation', () => ({
  useSessionNavigation: () => ({
    navigateToSessionDetail: navigateToSessionDetailMock,
  }),
}))

const buildSessionsResponse = (sessionOverrides: Partial<Record<string, unknown>> = {}) => {
  return {
    data: [
      {
        id: 'session-1',
        type: 'session',
        attributes: {
          session_id: 'session-1',
          title: 'デモセッション: サマリー付き',
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
          speaker_roles: [ 'user', 'assistant' ],
          raw_session_meta: {
            summary: 'サマリーです',
          },
          ...sessionOverrides,
        },
      },
    ],
    meta: {
      page: 1,
      per_page: 25,
      total_pages: 1,
      total_count: 1,
      filters: {},
      index: {
        updated_at: '2025-03-14T10:30:00Z',
      },
    },
    errors: [],
  }
}

describe('SessionsDateListView (integration)', () => {
  beforeEach(() => {
    navigateToSessionDetailMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('当日分のセッションを取得し、正しいクエリパラメータでAPIを呼び出す', async () => {
    // 利用者が画面表示直後に当日のセッションを確認できることを保証する
    const requestedDates: { start?: string | null; end?: string | null }[] = []
    server.use(
      http.get('/api/sessions', ({ request }) => {
        const url = new URL(request.url)
        requestedDates.push({
          start: url.searchParams.get('start_date'),
          end: url.searchParams.get('end_date'),
        })
        return HttpResponse.json(buildSessionsResponse())
      }),
    )

    render(<SessionsDateListView />)

    expect(screen.getAllByTestId('session-card-skeleton')).toHaveLength(3)

    expect(await screen.findByRole('heading', { name: 'デモセッション: サマリー付き' })).toBeInTheDocument()
    expect(screen.getByText('最終更新: 2025/3/14 10:30')).toBeInTheDocument()
    const todayIso = toISODate(new Date())
    expect(requestedDates).toEqual([
      { start: todayIso, end: todayIso },
    ])
  })

  it('ゼロ件レスポンス時に空状態メッセージを表示する', async () => {
    // 対象日にセッションが存在しない場合でも正しい案内が表示されることを保証する
    server.use(
      http.get('/api/sessions', () => {
        return HttpResponse.json({
          data: [],
          meta: {
            page: 1,
            per_page: 25,
            total_pages: 0,
            total_count: 0,
            filters: {},
          },
          errors: [],
        })
      }),
    )

    render(<SessionsDateListView />)

    expect(await screen.findByText('この日に保存されたセッションはありません。')).toBeInTheDocument()
    expect(screen.getByText('別の日付を選択するか、インデックスを更新してください。')).toBeInTheDocument()
  })

  it('サーバーエラー後にリトライすると成功レスポンスへ復帰する', async () => {
    // 利用者がエラー再発時に即座にリトライできることを保証する
    let requestCount = 0
    server.use(
      http.get('/api/sessions', () => {
        requestCount += 1
        if (requestCount <= 2) {
          return HttpResponse.json(
            {
              data: null,
              errors: [
                {
                  status: '500',
                  title: 'Server error',
                  detail: 'Temporary failure',
                },
              ],
              meta: {},
            },
            { status: 500 },
          )
        }
        return HttpResponse.json(buildSessionsResponse())
      }),
    )

    render(<SessionsDateListView />)

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500')

    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'デモセッション: サマリー付き' })).toBeInTheDocument()
    })
    expect(requestCount).toBe(3)
  })

  it('セッションカードを選択すると詳細ナビゲーションをトリガーする', async () => {
    // 利用者がカード操作でセッション詳細へ遷移できる導線を保証する
    server.use(
      http.get('/api/sessions', () => {
        return HttpResponse.json(buildSessionsResponse())
      }),
    )

    render(<SessionsDateListView />)

    const cardHeading = await screen.findByRole('heading', { name: 'デモセッション: サマリー付き' })
    fireEvent.click(cardHeading.closest('button')!)

    expect(navigateToSessionDetailMock).toHaveBeenCalledWith('session-1')
  })
})

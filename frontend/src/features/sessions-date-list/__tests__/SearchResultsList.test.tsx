import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { SearchResponse } from '@/api/types/search'

import SearchResultsList from '../SearchResultsList'

const buildResponse = (overrides?: Partial<SearchResponse>): SearchResponse => ({
  data: [
    {
      id: 'hit-1',
      type: 'search_result',
      attributes: {
        session_id: 'session-1',
        scope: 'chat_messages',
        highlight: 'history <mark>search</mark> snippet',
        occurred_at: '2025-03-20T10:00:00Z',
        message_role: 'assistant',
        message_id: 'message-1',
        relative_path: '2025/03/20/session-1.jsonl',
        occurrence_index: 1,
      },
      links: {
        session: '/sessions/session-1',
      },
    },
    {
      id: 'hit-2',
      type: 'search_result',
      attributes: {
        session_id: 'session-1',
        scope: 'chat_messages',
        highlight: 'another <mark>result</mark>',
        occurred_at: '2025-03-20T11:00:00Z',
        message_role: 'user',
        message_id: 'message-2',
        relative_path: '2025/03/20/session-1.jsonl',
        occurrence_index: 2,
      },
      links: {
        session: '/sessions/session-1',
      },
    },
  ],
  meta: {
    pagination: {
      page: 1,
      limit: 25,
      total_count: 2,
      total_pages: 1,
    },
    filters: {
      keyword: 'history',
      scope: 'chat_messages',
    },
  },
  errors: [],
  ...overrides,
})

describe('SearchResultsList', () => {
  it('ハイライトとヒット件数バッジを描画する', () => {
    // 目的: highlight HTML をサニタイズして表示し、複数ヒットを集計する
    const response = buildResponse()

    const onSelect = vi.fn()

    const { container } = render(
      <SearchResultsList
        status="success"
        response={response}
        keyword="history"
        onRetry={vi.fn()}
        onResultSelect={onSelect}
        page={1}
        onPageChange={vi.fn()}
        isPagingDisabled={false}
      />,
    )

    expect(screen.getAllByText('session-1')).toHaveLength(2)
    expect(screen.getByText('2件ヒット')).toBeInTheDocument()
    expect(container.querySelectorAll('mark')).toHaveLength(2)
  })

  it('ページネーション操作をハンドラーへ伝搬する', () => {
    // 目的: meta.pagination.total_pages > 1 の場合にページャを表示し、onPageChange を呼び出す
    const response = buildResponse({
      meta: {
        pagination: {
          page: 2,
          limit: 25,
          total_count: 60,
          total_pages: 3,
        },
        filters: {
          keyword: 'history',
          scope: 'chat_messages',
        },
      },
    })

    const onPageChange = vi.fn()

    render(
      <SearchResultsList
        status="success"
        response={response}
        keyword="history"
        onRetry={vi.fn()}
        onResultSelect={vi.fn()}
        page={2}
        onPageChange={onPageChange}
        isPagingDisabled={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '検索結果を前のページへ' }))

    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})

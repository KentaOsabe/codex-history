import { http, HttpResponse, delay } from 'msw'
import { describe, expect, it } from 'vitest'

import { ApiClientError, ApiServerError, ApiTimeoutError } from '../errors'
import { searchApi } from '../search'
import { server } from '../testServer'

describe('searchApi (msw)', () => {
  it('キーワード検索でハイライト付き結果とページ情報を受け取る', async () => {
    // 目的: 正常系で data/meta/filters が期待通り返ることを確認する
    server.use(
      http.get('/api/search', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('keyword')).toBe('rubocop')

        return HttpResponse.json({
          data: [
            {
              id: 'session-1:message-1:1',
              type: 'search_result',
              attributes: {
                session_id: 'session-1',
                scope: 'chat_messages',
                highlight: 'run <mark>rubocop</mark>',
                occurred_at: '2025-10-01T00:00:00Z',
                message_role: 'user',
                message_id: 'message-1',
                relative_path: '2025-10-01/session-1.jsonl',
                occurrence_index: 1,
              },
              links: {
                session: '/api/sessions/session-1',
              },
            },
          ],
          meta: {
            pagination: {
              page: 1,
              limit: 10,
              total_pages: 1,
              total_count: 1,
            },
            filters: {
              keyword: 'rubocop',
              scope: 'chat_messages',
            },
            timing: {
              duration_ms: 2.4,
            },
          },
          errors: [],
        })
      }),
    )

    const response = await searchApi.search({ keyword: 'rubocop' })

    expect(response.data).toHaveLength(1)
    expect(response.data[0].attributes.highlight).toContain('<mark>rubocop</mark>')
    expect(response.meta.pagination.total_count).toBe(1)
    expect(response.meta.filters.keyword).toBe('rubocop')
  })

  it('400 invalid_parameters のレスポンスを ApiClientError として受け取る', async () => {
    // 目的: invalid_fields を含む 400 エラーが ApiClientError で伝播することを確認する
    server.use(
      http.get('/api/search', () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              {
                code: 'invalid_parameters',
                status: '400',
                title: 'Invalid keyword',
                detail: 'keyword is required',
                meta: {
                  invalid_fields: {
                    keyword: [ 'must be present' ],
                  },
                },
              },
            ],
            meta: {},
          },
          { status: 400 },
        ),
      ),
    )

    await expect(searchApi.search({ keyword: ' ' })).rejects.toMatchObject({
      status: 400,
      meta: {
        invalid_fields: {
          keyword: [ 'must be present' ],
        },
      },
    })
  })

  it('422 invalid_payload のレスポンスを ApiClientError として扱う', async () => {
    // 目的: 422 エラーも ApiClientError に分類されることを確認する
    server.use(
      http.get('/api/search', () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              {
                code: 'invalid_payload',
                status: '422',
                title: 'Corrupted session',
                detail: 'session payload could not be parsed',
              },
            ],
            meta: {},
          },
          { status: 422 },
        ),
      ),
    )

    await expect(searchApi.search({ keyword: 'rubocop' })).rejects.toBeInstanceOf(ApiClientError)
  })

  it('500 エラー時は ApiServerError を投げる', async () => {
    // 目的: サーバー側の障害が ApiServerError として扱われることを確認する
    server.use(
      http.get('/api/search', () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              {
                code: 'missing_root',
                status: '500',
                title: 'Sessions root missing',
                detail: 'root directory is not mounted',
              },
            ],
            meta: {},
          },
          { status: 500 },
        ),
      ),
    )

    await expect(searchApi.search({ keyword: 'rubocop' })).rejects.toBeInstanceOf(ApiServerError)
  })

  it('応答がタイムアウトした場合は ApiTimeoutError を投げる', async () => {
    // 目的: 長時間応答がない場合に httpClient のタイムアウトが発火することを確認する
    server.use(
      http.get('/api/search', async () => {
        await delay(20_000)
        return HttpResponse.json({ data: [], meta: {}, errors: [] })
      }),
    )

    await expect(searchApi.search({ keyword: 'slow' })).rejects.toBeInstanceOf(ApiTimeoutError)
  })
})

import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { ApiConflictError } from '../errors'
import { sessionsApi } from '../sessions'
import { server } from '../testServer'

describe('sessionsApi (msw)', () => {
  it('セッション一覧を取得して meta と data を返す', async () => {
    server.use(
      http.get('/api/sessions', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('per_page')).toBe('25')
        return HttpResponse.json({
          data: [
            {
              id: 'session-123',
              type: 'session',
              attributes: {
                session_id: 'session-123',
                title: 'session-123',
                relative_path: '2025/10/10/session-123.jsonl',
                created_at: '2025-10-10T00:00:00Z',
                completed_at: '2025-10-10T01:00:00Z',
                duration_seconds: 3600,
                message_count: 12,
                tool_call_count: 1,
                tool_result_count: 1,
                reasoning_count: 0,
                meta_event_count: 0,
                has_sanitized_variant: false,
                speaker_roles: [ 'user', 'assistant' ],
              },
            },
          ],
          meta: {
            page: 1,
            per_page: 25,
            total_pages: 1,
            total_count: 1,
            filters: {},
          },
          errors: [],
        })
      }),
    )

    const response = await sessionsApi.list({ perPage: 25 })

    expect(response.data).toHaveLength(1)
    expect(response.data[0].attributes.session_id).toBe('session-123')
    expect(response.meta.total_count).toBe(1)
  })

  it('422 エラー時に ApiClientError を投げ meta を参照できる', async () => {
    server.use(
      http.get('/api/sessions', () => {
        return HttpResponse.json(
          {
            data: null,
            errors: [
              {
                code: 'invalid_parameters',
                status: '422',
                title: 'Invalid period',
                detail: 'Invalid date range',
                meta: { invalid_fields: { start_date: [ 'is after end_date' ] } },
              },
            ],
            meta: {},
          },
          { status: 422 },
        )
      }),
    )

    await expect(
      sessionsApi.list({ startDate: '2025-10-31', endDate: '2025-10-01' }),
    ).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 422,
      meta: { invalid_fields: { start_date: [ 'is after end_date' ] } },
    })
  })

  it('リフレッシュ API で 409 コンフリクトが返ると ApiConflictError を投げる', async () => {
    server.use(
      http.post('/api/sessions/refresh', () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              {
                code: 'refresh_in_progress',
                status: '409',
                title: 'Sessions refresh is already running',
                detail: 'Refresh job is already running',
              },
            ],
            meta: {
              job: {
                id: 'job-123',
                status: 'running',
              },
            },
          },
          { status: 409 },
        ),
      ),
    )

    await expect(sessionsApi.requestRefresh()).rejects.toBeInstanceOf(ApiConflictError)
  })
})

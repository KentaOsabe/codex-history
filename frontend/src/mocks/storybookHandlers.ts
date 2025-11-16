import { http, HttpResponse } from 'msw'

import type { SearchResponse } from '@/api/types/search'
import type { SessionDetailResponse, SessionsIndexResponse } from '@/api/types/sessions'

const sampleSessionsResponse: SessionsIndexResponse = {
  data: [
    {
      id: 'session-2025-03-14-001',
      type: 'session',
      attributes: {
        session_id: 'session-2025-03-14-001',
        title: 'Voiceflow アーカイブ同期ジョブ',
        relative_path: '2025/03/14/session-2025-03-14-001.jsonl',
        created_at: '2025-03-14T08:10:00Z',
        completed_at: '2025-03-14T08:38:00Z',
        duration_seconds: 1680,
        message_count: 42,
        tool_call_count: 4,
        tool_result_count: 4,
        reasoning_count: 0,
        meta_event_count: 3,
        has_sanitized_variant: true,
        speaker_roles: [ 'user', 'assistant', 'tool' ],
      },
    },
    {
      id: 'session-2025-03-14-002',
      type: 'session',
      attributes: {
        session_id: 'session-2025-03-14-002',
        title: 'Codex History メンテナンスタスク',
        relative_path: '2025/03/14/session-2025-03-14-002.jsonl',
        created_at: '2025-03-14T11:50:00Z',
        completed_at: '2025-03-14T12:05:00Z',
        duration_seconds: 900,
        message_count: 18,
        tool_call_count: 2,
        tool_result_count: 2,
        reasoning_count: 1,
        meta_event_count: 0,
        has_sanitized_variant: false,
        speaker_roles: [ 'user', 'assistant' ],
      },
    },
  ],
  meta: {
    page: 1,
    per_page: 25,
    total_pages: 4,
    total_count: 86,
    filters: {
      start_date: '2025-03-10',
      end_date: '2025-03-14',
    },
    updated_at: '2025-03-14T12:07:00Z',
  },
  errors: [],
}

const sampleSessionDetailResponse: SessionDetailResponse = {
  data: {
    id: 'session-2025-03-14-001',
    type: 'session',
    attributes: {
      session_id: 'session-2025-03-14-001',
      title: 'Voiceflow アーカイブ同期ジョブ',
      relative_path: '2025/03/14/session-2025-03-14-001.jsonl',
      created_at: '2025-03-14T08:10:00Z',
      completed_at: '2025-03-14T08:38:00Z',
      duration_seconds: 1680,
      message_count: 42,
      tool_call_count: 4,
      tool_result_count: 4,
      reasoning_count: 1,
      meta_event_count: 3,
      has_sanitized_variant: true,
      speaker_roles: ['user', 'assistant', 'tool'],
      messages: [
        {
          id: 'message-user-1',
          timestamp: '2025-03-14T08:12:00Z',
          source_type: 'message',
          role: 'user',
          segments: [
            {
              channel: 'input',
              type: 'text',
              text: '最新の同期ジョブの結果をまとめてください。',
            },
          ],
        },
        {
          id: 'message-assistant-1',
          timestamp: '2025-03-14T08:12:15Z',
          source_type: 'message',
          role: 'assistant',
          segments: [
            {
              channel: 'output',
              type: 'text',
              text: 'ジョブは 28 分で完了し、エラーは検出されませんでした。',
            },
          ],
        },
        {
          id: 'tool-call-1',
          timestamp: '2025-03-14T08:13:00Z',
          source_type: 'tool_call',
          role: 'tool',
          segments: [
            {
              channel: 'meta',
              type: 'text',
              text: 'refreshSessionsIndex を起動しています…',
            },
          ],
          tool_call: {
            call_id: 'refresh-1',
            name: 'refreshSessionsIndex',
            arguments: '{"range":"2025-03-10..2025-03-14"}',
            status: 'succeeded',
          },
          tool_result: {
            call_id: 'refresh-1',
            output: 'index=codex_history refreshed successfully',
          },
        },
      ],
    },
  },
  meta: {
    session: {
      relative_path: '2025/03/14/session-2025-03-14-001.jsonl',
      signature: 'sha256:abcd1234',
      raw_session_meta: {
        source: 'voiceflow-sync',
      },
    },
    links: {
      download: '/downloads/session-2025-03-14-001.jsonl',
    },
  },
  errors: [],
}

const sampleSearchResponse: SearchResponse = {
  data: [
    {
      id: 'search-result-001',
      type: 'search_result',
      attributes: {
        session_id: 'session-2025-03-14-001',
        scope: 'chat_messages',
        highlight: 'history API の <mark>refresh</mark> が成功しました',
        occurred_at: '2025-03-14T08:25:00Z',
        message_role: 'assistant',
        message_id: 'message-1',
        relative_path: '2025/03/14/session-2025-03-14-001.jsonl',
        occurrence_index: 1,
      },
      links: {
        session: '/sessions/session-2025-03-14-001',
      },
    },
    {
      id: 'search-result-002',
      type: 'search_result',
      attributes: {
        session_id: 'session-2025-03-14-002',
        scope: 'chat_messages',
        highlight: '<mark>status banner</mark> が 409 を検出',
        occurred_at: '2025-03-14T12:02:00Z',
        message_role: 'assistant',
        message_id: 'message-7',
        relative_path: '2025/03/14/session-2025-03-14-002.jsonl',
        occurrence_index: 1,
      },
      links: {
        session: '/sessions/session-2025-03-14-002',
      },
    },
  ],
  meta: {
    pagination: {
      page: 1,
      limit: 25,
      total_count: 12,
      total_pages: 2,
    },
    filters: {
      keyword: 'history',
      scope: 'chat_messages',
    },
    timing: {
      duration_ms: 132,
    },
  },
  errors: [],
}

export const storybookSessionHandlers = () => [
  http.get('/api/sessions', () => HttpResponse.json(sampleSessionsResponse)),
  http.get('/api/search', () => HttpResponse.json(sampleSearchResponse)),
]

export const storybookSessionDetailHandlers = () => [
  http.get('/api/sessions/:sessionId', ({ params }) => {
    const { sessionId } = params as { sessionId: string }
    if (sessionId === 'session-2025-03-14-001') {
      return HttpResponse.json(sampleSessionDetailResponse)
    }
    return HttpResponse.json(sampleSessionDetailResponse)
  }),
]

export const storybookSessionErrorHandlers = () => [
  http.get('/api/sessions', () =>
    HttpResponse.json(
      {
        data: [],
        meta: sampleSessionsResponse.meta,
        errors: [
          {
            code: 'unavailable',
            status: '503',
            title: 'Service unavailable',
            detail: 'Backend is warming up',
          },
        ],
      },
      { status: 503 },
    ),
  ),
  http.get('/api/search', () => HttpResponse.json(sampleSearchResponse)),
]

export const storybookData = {
  sessions: sampleSessionsResponse,
  search: sampleSearchResponse,
  sessionDetail: sampleSessionDetailResponse,
}

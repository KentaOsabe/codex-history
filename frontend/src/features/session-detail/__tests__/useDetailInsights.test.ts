import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SessionDetailViewModel, SessionMessageViewModel } from '../types'
import { useDetailInsights } from '../useDetailInsights'

const buildDetail = (messages: SessionMessageViewModel[]): SessionDetailViewModel => ({
  sessionId: 'session-1',
  title: 'Session 1',
  variant: 'original',
  sanitizedAvailable: true,
  stats: {
    messageCount: messages.length,
    reasoningCount: 0,
    toolCallCount: 0,
    durationSeconds: 0,
  },
  meta: {
    relativePath: 'sessions/session-1.jsonl',
  },
  messages,
})

const makeMessage = (overrides: Partial<SessionMessageViewModel>): SessionMessageViewModel => ({
  id: overrides.id ?? 'message-1',
  timestampIso: overrides.timestampIso ?? '2025-03-14T09:00:00Z',
  timestampLabel: overrides.timestampLabel ?? '2025/03/14 09:00:00',
  role: overrides.role ?? 'tool',
  sourceType: overrides.sourceType ?? 'tool_call',
  channel: overrides.channel ?? 'meta',
  segments: overrides.segments ?? [],
  toolCall: overrides.toolCall,
  isEncryptedReasoning: false,
})

describe('useDetailInsights', () => {
  it('call_id ごとにツール呼び出しを結合し、開始/終了時刻から duration を算出する (R2)', () => {
    const detail = buildDetail([
      makeMessage({
        id: 'call-1-start',
        timestampIso: '2025-03-14T09:00:00Z',
        timestampLabel: '2025/03/14 09:00:00',
        sourceType: 'tool_call',
        toolCall: {
          callId: 'call-1',
          name: 'shell',
          argumentsJson: { command: [ 'echo', 'hello' ] },
          argumentsText: '{"command":["echo","hello"]}',
          status: 'pending',
        },
      }),
      makeMessage({
        id: 'call-1-result',
        timestampIso: '2025-03-14T09:00:05Z',
        timestampLabel: '2025/03/14 09:00:05',
        sourceType: 'tool_result',
        toolCall: {
          callId: 'call-1',
          name: 'shell',
          status: 'completed',
          resultJson: { stdout: 'ok' },
          resultText: '{"stdout":"ok"}',
        },
      }),
    ])

    const { result } = renderHook(() => useDetailInsights(detail))

    expect(result.current.toolInvocations).toHaveLength(1)
    const invocation = result.current.toolInvocations[0]
    expect(invocation.callId).toBe('call-1')
    expect(invocation.name).toBe('shell')
    expect(invocation.durationMs).toBe(5000)
    expect(invocation.status).toBe('success')
    expect(invocation.argumentsValue).toMatchObject({ command: [ 'echo', 'hello' ] })
    expect(invocation.resultValue).toMatchObject({ stdout: 'ok' })
  })

  it('結果が存在しない call_id は pending として出力し、出力なし扱いにする (R2)', () => {
    const detail = buildDetail([
      makeMessage({
        id: 'call-2-start',
        timestampIso: '2025-03-14T09:10:00Z',
        timestampLabel: '2025/03/14 09:10:00',
        sourceType: 'tool_call',
        toolCall: {
          callId: 'call-2',
          name: 'search',
          argumentsText: '{"keyword":"Codex"}',
          status: 'pending',
        },
      }),
    ])

    const { result } = renderHook(() => useDetailInsights(detail))

    expect(result.current.toolInvocations).toHaveLength(1)
    const invocation = result.current.toolInvocations[0]
    expect(invocation.status).toBe('pending')
    expect(invocation.resultValue).toBeUndefined()
  })
})

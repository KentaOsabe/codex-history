import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useConversationEvents } from '../useConversationEvents'

import type { SessionDetailViewModel, SessionMessageViewModel } from '../types'

type PartialMessage = Partial<SessionMessageViewModel> & Pick<SessionMessageViewModel, 'id'>

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

const makeMessage = (overrides: PartialMessage): SessionMessageViewModel => ({
  id: overrides.id,
  timestampIso: overrides.timestampIso ?? '2025-03-14T09:00:00Z',
  timestampLabel: overrides.timestampLabel ?? '2025/03/14 09:00:00',
  role: overrides.role ?? 'user',
  sourceType: overrides.sourceType ?? 'message',
  channel: overrides.channel ?? 'input',
  segments: overrides.segments ?? [
    {
      id: `${overrides.id}-segment-1`,
      channel: overrides.channel ?? 'input',
      text: overrides.segments?.[0]?.text ?? `${overrides.id} body`,
    },
  ],
  toolCall: overrides.toolCall,
  isEncryptedReasoning: overrides.isEncryptedReasoning ?? false,
  raw: overrides.raw,
  metadata: overrides.metadata,
})

describe('useConversationEvents', () => {
  it('conversation モード対象となる user/assistant のみを抽出し、非表示件数を算出する (R2.1)', () => {
    const detail = buildDetail([
      makeMessage({ id: 'user-1', role: 'user', channel: 'input' }),
      makeMessage({ id: 'meta-1', role: 'meta', sourceType: 'meta', channel: 'meta' }),
      makeMessage({ id: 'assistant-1', role: 'assistant', channel: 'output', sourceType: 'message' }),
    ])

    const { result } = renderHook(() => useConversationEvents({ detail, variant: 'original' }))

    expect(result.current.conversationMessages.map((msg) => msg.id)).toEqual(['user-1', 'assistant-1'])
    expect(result.current.hiddenCount).toBe(1)
  })

  it('meta / tool メッセージを bundle summary に集計する (R2.1/R2.2)', () => {
    const detail = buildDetail([
      makeMessage({ id: 'user-1', role: 'user' }),
      makeMessage({ id: 'tool-call-1', role: 'tool', sourceType: 'tool_call', toolCall: { callId: 'call-1', name: 'search' } }),
      makeMessage({ id: 'tool-result-1', role: 'tool', sourceType: 'tool_result', toolCall: { callId: 'call-1', resultText: 'ok' } }),
      makeMessage({ id: 'meta-1', role: 'meta', sourceType: 'meta', channel: 'meta' }),
      makeMessage({ id: 'assistant-1', role: 'assistant', channel: 'output' }),
    ])

    const { result } = renderHook(() => useConversationEvents({ detail, variant: 'original' }))

    const metaSummary = result.current.bundleSummaries.find((summary) => summary.bundleType === 'meta')
    expect(metaSummary).toMatchObject({ count: 1, label: 'メタイベント' })

    const toolSummary = result.current.bundleSummaries.find((summary) => summary.bundleType === 'tool')
    expect(toolSummary).toMatchObject({ count: 2 })
  })

  it('ConversationEventLinker でユーザー入力とツールイベント・アシスタント応答を関連付ける (R2.3)', () => {
    const detail = buildDetail([
      makeMessage({ id: 'user-1', role: 'user' }),
      makeMessage({
        id: 'tool-call-1',
        role: 'tool',
        sourceType: 'tool_call',
        toolCall: { callId: 'call-1', name: 'shell', argumentsText: '{"cmd":"ls"}' },
      }),
      makeMessage({
        id: 'tool-result-1',
        role: 'tool',
        sourceType: 'tool_result',
        toolCall: { callId: 'call-1', resultText: 'done' },
      }),
      makeMessage({ id: 'assistant-1', role: 'assistant', channel: 'output' }),
    ])

    const { result } = renderHook(() => useConversationEvents({ detail, variant: 'original' }))

    const assistantEvent = result.current.events.find(
      (event) => event.kind === 'message' && event.message.id === 'assistant-1',
    )
    expect(assistantEvent?.relatedIds).toEqual(expect.arrayContaining(['user-1', 'tool-call-1', 'tool-result-1']))
  })

  it('サニタイズ variant では bundle preview を伏字表示し、sensitiveFields を付与する (R2.4)', () => {
    const detail = buildDetail([
      makeMessage({ id: 'user-1', role: 'user' }),
      makeMessage({ id: 'meta-1', role: 'meta', sourceType: 'meta', channel: 'meta', segments: [ { id: 'seg', channel: 'meta', text: 'token usage 200' } ] }),
    ])

    const { result } = renderHook(() => useConversationEvents({ detail, variant: 'sanitized' }))

    const metaSummary = result.current.bundleSummaries.find((summary) => summary.bundleType === 'meta')
    expect(metaSummary?.preview).toBe('※サニタイズ済み')

    const bundleEvent = result.current.events.find((event) => event.kind === 'bundle' && event.bundleType === 'meta')
    expect(bundleEvent?.isSanitizedVariant).toBe(true)
    expect(bundleEvent?.sensitiveFields).toContain('events')
  })

  it('IDE コンテキストセクションを集約する', () => {
    const detail = buildDetail([
      makeMessage({
        id: 'user-1',
        role: 'user',
        metadata: {
          ideContext: {
            sections: [
              { heading: 'My request for Codex', content: 'タスク', defaultExpanded: true },
            ],
          },
        } as Record<string, unknown>,
      }),
      makeMessage({
        id: 'user-2',
        role: 'assistant',
      }),
      makeMessage({
        id: 'user-3',
        role: 'user',
        metadata: {
          ideContext: {
            sections: [
              { heading: 'Active file', content: 'frontend/src/App.tsx', defaultExpanded: false },
            ],
          },
        } as Record<string, unknown>,
      }),
    ])

    const { result } = renderHook(() => useConversationEvents({ detail, variant: 'original' }))

    expect(result.current.ideContextSections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ heading: 'My request for Codex' }),
        expect.objectContaining({ heading: 'Active file' }),
      ]),
    )
  })

  it('AGENTS.md セクションは ideContextSections に含めない', () => {
    const detail = buildDetail([
      makeMessage({
        id: 'user-1',
        role: 'user',
        metadata: {
          ideContext: {
            sections: [
              { heading: 'AGENTS.md', content: 'ノイズ', defaultExpanded: true },
              { heading: 'Active file', content: 'frontend/src/App.tsx', defaultExpanded: false },
            ],
          },
        } as Record<string, unknown>,
      }),
    ])

    const { result } = renderHook(() => useConversationEvents({ detail, variant: 'original' }))

    expect(result.current.ideContextSections).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ heading: 'AGENTS.md' })]),
    )
    expect(result.current.ideContextSections).toEqual(
      expect.arrayContaining([expect.objectContaining({ heading: 'Active file' })]),
    )
  })

  it('本文も IDE コンテキストもない user メッセージは会話表示から除外する', () => {
    const detail = buildDetail([
      makeMessage({
        id: 'user-empty',
        role: 'user',
        segments: [],
        metadata: {},
      }),
      makeMessage({
        id: 'user-ide',
        role: 'user',
        segments: [],
        metadata: {
          ideContext: { sections: [ { heading: 'My request for Codex', content: 'do it', defaultExpanded: true } ] },
        } as Record<string, unknown>,
      }),
      makeMessage({
        id: 'assistant-1',
        role: 'assistant',
      }),
    ])

    const { result } = renderHook(() => useConversationEvents({ detail, variant: 'original' }))

    expect(result.current.conversationMessages.map((msg) => msg.id)).toEqual(['user-ide', 'assistant-1'])
  })
})

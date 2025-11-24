import { describe, expect, it } from 'vitest'

import type { SessionDetailResponse } from '@/api/types/sessions'

import { mapResponseToViewModel } from '../mapResponseToViewModel'

describe('mapResponseToViewModel – IDE コンテキスト抽出', () => {
  const buildResponse = (messageText: string): SessionDetailResponse => ({
    data: {
      id: 'session-123',
      type: 'session',
      attributes: {
        session_id: 'session-123',
        title: 'Demo',
        relative_path: 'sessions/session-123.jsonl',
        created_at: '2025-03-14T09:00:00Z',
        completed_at: '2025-03-14T09:30:00Z',
        duration_seconds: 1800,
        message_count: 1,
        tool_call_count: 0,
        tool_result_count: 0,
        reasoning_count: 0,
        meta_event_count: 0,
        has_sanitized_variant: false,
        speaker_roles: ['user'],
        messages: [
          {
            id: 'msg-user-1',
            role: 'user',
            source_type: 'message',
            timestamp: '2025-03-14T09:00:00Z',
            segments: [
              {
                channel: 'input',
                type: 'text',
                format: 'markdown',
                text: messageText,
              },
            ],
          },
        ],
      },
    },
    meta: {
      session: {
        relative_path: 'sessions/session-123.jsonl',
      },
      links: {
        download: '/sessions/session-123.jsonl',
      },
    },
    errors: [],
  })

  it('セクションの見出しと本文を metadata.ideContext.sections に格納する', () => {
    const response = buildResponse(`# Context from my IDE setup

## Active file: frontend/src/App.tsx
行 1

## Open tabs:
- README.md
- SessionDetailPage.tsx

## My request for Codex
/kiro:spec-impl issue-36 6
`)

    const viewModel = mapResponseToViewModel(response, 'original')
    const message = viewModel.messages[0]
    const sections = message.metadata?.ideContext?.sections ?? []

    expect(sections).toHaveLength(3)
    expect(sections[0]).toMatchObject({ heading: 'Active file', content: 'frontend/src/App.tsx\n行 1' })
    const requestSection = sections.find((section) => section.heading === 'My request for Codex')
    expect(requestSection?.content).toContain('/kiro:spec-impl issue-36 6')
    expect(requestSection?.defaultExpanded).toBe(true)
  })

  it('ユーザー本文内の IDE コンテキストブロックをタイムライン本文から取り除く', () => {
    const response = buildResponse(`Hotfix をお願いします。

追加要件はありません。

# Context from my IDE setup

## Active file: frontend/src/main.tsx
L10

## My request for Codex
/kiro:spec-impl issue-36 7`)

    const viewModel = mapResponseToViewModel(response, 'original')
    const message = viewModel.messages[0]

    expect(message.metadata?.ideContext?.sections).toHaveLength(2)
    expect(message.segments).toHaveLength(1)
    expect(message.segments[0]?.text).toContain('Hotfix をお願いします。')
    expect(message.segments[0]?.text).not.toMatch(/#\s+Context from my IDE setup/i)
  })

  it('本文が IDE コンテキストのみの場合は segments を空にする', () => {
    const response = buildResponse(`# Context from my IDE setup

## Active file: backend/app.rb
`)

    const viewModel = mapResponseToViewModel(response, 'original')
    const message = viewModel.messages[0]

    expect(message.metadata?.ideContext?.sections).not.toHaveLength(0)
    expect(message.segments).toHaveLength(0)
  })

  it('AGENTS.md セクションをタイムラインにも IDE コンテキストにも含めない', () => {
    const response = buildResponse(`# AGENTS.md instructions for /path

<INSTRUCTIONS>
# AGENTS.md
- 常に日本語で回答
- TDD を守る
</INSTRUCTIONS>

# Context from my IDE setup

## Active file: frontend/src/App.tsx

## My request for Codex
/kiro:spec-impl issue-36 9
`)

    const viewModel = mapResponseToViewModel(response, 'original')
    const message = viewModel.messages[0]
    const headings = (message.metadata?.ideContext?.sections ?? []).map((section) => section.heading)

    expect(headings).toEqual(expect.arrayContaining(['Active file', 'My request for Codex']))
    expect(headings).not.toEqual(expect.arrayContaining([expect.stringMatching(/AGENTS/i)]))
    expect(message.segments).toHaveLength(0)
    expect(JSON.stringify(message)).not.toMatch(/AGENTS\.md/i)
  })

  it('複数のユーザーメッセージを連続で処理しても IDE コンテキストを検出できる', () => {
    const response: SessionDetailResponse = {
      data: {
        id: 'session-456',
        type: 'session',
        attributes: {
          session_id: 'session-456',
          title: 'Demo 2',
          relative_path: 'sessions/session-456.jsonl',
          created_at: '2025-03-15T09:00:00Z',
          completed_at: '2025-03-15T09:10:00Z',
          duration_seconds: 600,
          message_count: 2,
          tool_call_count: 0,
          tool_result_count: 0,
          reasoning_count: 0,
          meta_event_count: 0,
          has_sanitized_variant: false,
          speaker_roles: ['user'],
          messages: [
            {
              id: 'msg-user-1',
              role: 'user',
              source_type: 'message',
              timestamp: '2025-03-15T09:00:00Z',
              segments: [
                {
                  channel: 'input',
                  type: 'text',
                  format: 'markdown',
                  text: `# Context from my IDE setup

## Active file: frontend/src/App.tsx
line 1

## My request for Codex
first message`,
                },
              ],
            },
            {
              id: 'msg-user-2',
              role: 'user',
              source_type: 'message',
              timestamp: '2025-03-15T09:05:00Z',
              segments: [
                {
                  channel: 'input',
                  type: 'text',
                  format: 'markdown',
                  text: `# Context from my IDE setup

## My request for Codex
second message`,
                },
              ],
            },
          ],
        },
      },
      meta: {
        session: {
          relative_path: 'sessions/session-456.jsonl',
        },
        links: {
          download: '/sessions/session-456.jsonl',
        },
      },
      errors: [],
    }

    const viewModel = mapResponseToViewModel(response, 'original')

    expect(viewModel.messages[0]?.metadata?.ideContext?.sections).not.toHaveLength(0)
    expect(viewModel.messages[1]?.metadata?.ideContext?.sections).not.toHaveLength(0)
  })

  it('environment_context ブロックをサニタイズし、本文や IDE コンテキストに含めない', () => {
    const response = buildResponse(`<environment_context>
OS: macOS
Node: 22
</environment_context>

# Context from my IDE setup

## My request for Codex
/kiro:spec-impl issue-36 10
`)

    const viewModel = mapResponseToViewModel(response, 'original')
    const message = viewModel.messages[0]
    const headings = (message.metadata?.ideContext?.sections ?? []).map((section) => section.heading)

    expect(headings).toEqual([ 'My request for Codex' ])
    expect(message.segments).toHaveLength(0)
    expect(JSON.stringify(message)).not.toMatch(/environment_context/i)
  })
})

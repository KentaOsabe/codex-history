import { describe, expect, it } from 'vitest'

import type { SessionDetailResponse } from '@/api/types/sessions'

import { mapResponseToViewModel } from '../mapResponseToViewModel'

describe('mapResponseToViewModel – ユーザーメッセージ整形', () => {
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

  it('My request を本文セグメントの先頭へ昇格し、残りはオプション化する', () => {
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

    expect(message.segments[0]?.text).toContain('/kiro:spec-impl issue-36 6')
    expect(message.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Active file', value: 'frontend/src/App.tsx\n行 1' }),
        expect.objectContaining({ label: 'Open tabs', value: '- README.md\n- SessionDetailPage.tsx' }),
      ]),
    )
    expect(message.metadata?.ideContext).toBeUndefined()
  })

  it('本文に残したい文章と My request を分離し、本文から IDE コンテキストを除去する', () => {
    const response = buildResponse(`Hotfix をお願いします。

追加要件はありません。

# Context from my IDE setup

## Active file: frontend/src/main.tsx
L10

## My request for Codex
/kiro:spec-impl issue-36 7`)

    const viewModel = mapResponseToViewModel(response, 'original')
    const message = viewModel.messages[0]

    expect(message.segments[0]?.text).toContain('/kiro:spec-impl issue-36 7')
    expect(message.segments[1]?.text).toContain('Hotfix をお願いします。')
    expect(JSON.stringify(message.segments)).not.toMatch(/Context from my IDE setup/i)
    expect(message.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Active file', value: 'frontend/src/main.tsx\nL10' }),
      ]),
    )
  })

  it('IDE コンテキストのみの入力はオプションとして保持し、本文は空にする', () => {
    const response = buildResponse(`# Context from my IDE setup

## Active file: backend/app.rb
`)

    const viewModel = mapResponseToViewModel(response, 'original')
    const message = viewModel.messages[0]

    expect(message.segments).toHaveLength(0)
    expect(message.options?.length).toBeGreaterThan(0)
  })

  it('AGENTS.md セクションを本文やオプションから除外する', () => {
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
    const optionLabels = (message.options ?? []).map((option) => option.label)

    expect(message.segments[0]?.text).toContain('/kiro:spec-impl issue-36 9')
    expect(optionLabels).toEqual(expect.arrayContaining(['Active file']))
    expect(optionLabels).not.toEqual(expect.arrayContaining([expect.stringMatching(/AGENTS/i)]))
    expect(JSON.stringify(message)).not.toMatch(/AGENTS\.md/i)
  })

  it('複数のユーザーメッセージでも My request を本文へ昇格させる', () => {
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

    expect(viewModel.messages[0]?.segments[0]?.text).toBe('first message')
    expect(viewModel.messages[1]?.segments[0]?.text).toBe('second message')
    expect(viewModel.messages[0]?.metadata?.ideContext).toBeUndefined()
  })

  it('environment_context ブロックを除去し、My request だけを本文に残す', () => {
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

    expect(message.segments[0]?.text).toContain('/kiro:spec-impl issue-36 10')
    expect(message.options ?? []).toHaveLength(0)
    expect(JSON.stringify(message)).not.toMatch(/environment_context/i)
  })
})

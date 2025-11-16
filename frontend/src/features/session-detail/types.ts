import type { SessionVariant } from '@/api/types/sessions'

export type SessionDetailStatus = 'idle' | 'loading' | 'success' | 'error'

export type MessageChannel = 'input' | 'output' | 'meta'

export interface RenderedSegment {
  id: string
  channel: MessageChannel
  text: string
  format?: string | null
}

export type SanitizedViewerMode = 'default' | 'redacted'

export interface ToolCallViewModel {
  callId?: string
  name?: string
  argumentsText?: string
  argumentsJson?: unknown
  status?: string | null
  resultText?: string
  resultJson?: unknown
}

export interface SessionMessageViewModel {
  id: string
  timestampIso?: string | null
  timestampLabel?: string
  role: 'user' | 'assistant' | 'tool' | 'system' | 'meta'
  sourceType: 'message' | 'tool_call' | 'tool_result' | 'meta' | 'session'
  channel: MessageChannel
  segments: RenderedSegment[]
  toolCall?: ToolCallViewModel
  isEncryptedReasoning: boolean
  encryptedChecksum?: string
  encryptedLength?: number
  raw?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface ScrollAnchorSnapshot {
  offsetRatio: number
  absoluteOffset?: number
}

export interface SessionDetailViewModel {
  sessionId: string
  title: string
  variant: SessionVariant
  sanitizedAvailable: boolean
  stats: {
    messageCount: number
    reasoningCount: number
    toolCallCount: number
    durationSeconds: number
    completedAtLabel?: string
  }
  meta: {
    relativePath: string
    downloadUrl?: string
    lastUpdatedLabel?: string
  }
  messages: SessionMessageViewModel[]
}

export type ToolInvocationStatus = 'pending' | 'success' | 'error'

export interface ToolInvocationGroup {
  id: string
  callId: string
  name?: string
  status: ToolInvocationStatus
  startedAtLabel?: string
  completedAtLabel?: string
  durationMs?: number
  argumentsValue?: unknown
  argumentsLabel?: string
  resultValue?: unknown
  resultLabel?: string
}

export type MetaEventGroupKey = 'token_count' | 'agent_reasoning' | 'environment_context' | 'plain' | 'other'

export interface MetaEventEntry {
  id: string
  timestampLabel?: string
  summary: string
  payloadJson?: unknown
  tokenStats?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
  encryptedInfo?: {
    checksum?: string
    length?: number
  } | null
}

export interface MetaEventGroup {
  key: MetaEventGroupKey
  label: string
  events: MetaEventEntry[]
}

export interface SessionDetailInsights {
  toolInvocations: ToolInvocationGroup[]
  metaEvents: MetaEventGroup[]
}

export type ConversationEvent =
  | {
      kind: 'message'
      role: 'user' | 'assistant'
      message: SessionMessageViewModel
      relatedIds: string[]
      isSanitizedVariant: boolean
      sensitiveFields: string[]
    }
  | {
      kind: 'bundle'
      bundleType: 'meta' | 'tool'
      anchorMessageId?: string
      label: string
      count: number
      events: MetaEventGroup[] | ToolInvocationGroup[]
      isSanitizedVariant: boolean
      sensitiveFields: string[]
    }

export interface TimelineBundleSummary {
  id: string
  bundleType: 'meta' | 'tool'
  label: string
  count: number
  preview?: string
  anchorMessageId?: string
  isSanitizedVariant: boolean
}

export type TimelineDisplayMode = 'conversation' | 'full'

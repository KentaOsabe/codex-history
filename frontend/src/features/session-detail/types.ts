import type { SessionVariant } from '@/api/types/sessions'

export type SessionDetailStatus = 'idle' | 'loading' | 'success' | 'error'

export type MessageChannel = 'input' | 'output' | 'meta'

export interface RenderedSegment {
  id: string
  channel: MessageChannel
  text: string
  format?: string | null
}

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

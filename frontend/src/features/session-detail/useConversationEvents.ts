import { useMemo } from 'react'

import type { SessionVariant } from '@/api/types/sessions'

import { ConversationEventLinker } from './ConversationEventLinker'
import { useDetailInsights } from './useDetailInsights'

import type {
  ConversationEvent,
  SessionDetailViewModel,
  SessionMessageViewModel,
  TimelineBundleSummary,
} from './types'

interface UseConversationEventsParams {
  detail?: SessionDetailViewModel
  variant: SessionVariant
}

export interface UseConversationEventsResult {
  conversationMessages: SessionMessageViewModel[]
  events: ConversationEvent[]
  bundleSummaries: TimelineBundleSummary[]
  hiddenCount: number
}

const SANITIZED_PLACEHOLDER = '※サニタイズ済み'

const isConversationRole = (role: SessionMessageViewModel['role']): role is 'user' | 'assistant' => {
  return role === 'user' || role === 'assistant'
}

const isToolCategory = (message: SessionMessageViewModel): boolean => {
  return message.role === 'tool' || message.sourceType === 'tool_call' || message.sourceType === 'tool_result'
}

const isMetaCategory = (message: SessionMessageViewModel): boolean => {
  if (message.role === 'meta' || message.role === 'system') {
    return true
  }
  return message.sourceType === 'meta' || message.sourceType === 'session'
}

const deriveFirstText = (messages: SessionMessageViewModel[]): string | undefined => {
  for (const message of messages) {
    const segment = message.segments[0]
    const text = typeof segment?.text === 'string' ? segment.text.trim() : ''
    if (text) {
      return text
    }
  }
  return undefined
}

const deriveToolPreview = (messages: SessionMessageViewModel[]): string | undefined => {
  for (const message of messages) {
    const name = message.toolCall?.name?.trim()
    if (name) {
      return name
    }
    const label = deriveFirstText([ message ])
    if (label) {
      return label
    }
  }
  return undefined
}

export const useConversationEvents = ({ detail, variant }: UseConversationEventsParams): UseConversationEventsResult => {
  const { metaEvents, toolInvocations } = useDetailInsights(detail)
  const categorized = useMemo(() => {
    if (!detail) {
      return {
        conversation: [] as (SessionMessageViewModel & { role: 'user' | 'assistant' })[],
        meta: [] as SessionMessageViewModel[],
        tool: [] as SessionMessageViewModel[],
      }
    }

    const conversation: (SessionMessageViewModel & { role: 'user' | 'assistant' })[] = []
    const meta: SessionMessageViewModel[] = []
    const tool: SessionMessageViewModel[] = []

    detail.messages.forEach((message) => {
      if (isConversationRole(message.role)) {
        conversation.push(message as SessionMessageViewModel & { role: 'user' | 'assistant' })
        return
      }
      if (isToolCategory(message)) {
        tool.push(message)
        return
      }
      if (isMetaCategory(message)) {
        meta.push(message)
      }
    })

    return { conversation, meta, tool }
  }, [detail])

  const sanitized = variant === 'sanitized'
  const hiddenCount = categorized.meta.length + categorized.tool.length

  const relatedMap = useMemo(() => {
    if (!detail) {
      return {}
    }
    const linker = new ConversationEventLinker(detail.messages)
    return linker.build()
  }, [detail])

  const conversationEvents = useMemo<ConversationEvent[]>(() => {
    return categorized.conversation.map((message) => ({
      kind: 'message' as const,
      role: message.role,
      message,
      relatedIds: relatedMap[message.id] ?? [],
      isSanitizedVariant: sanitized,
      sensitiveFields: sanitized ? [ 'segments' ] : [],
    }))
  }, [categorized.conversation, relatedMap, sanitized])

  const bundleEvents = useMemo<ConversationEvent[]>(() => {
    const bundles: ConversationEvent[] = []
    if (categorized.meta.length) {
      bundles.push({
        kind: 'bundle',
        bundleType: 'meta',
        anchorMessageId: categorized.meta[0]?.id,
        label: 'メタイベント',
        count: categorized.meta.length,
        events: metaEvents,
        isSanitizedVariant: sanitized,
        sensitiveFields: sanitized ? [ 'events' ] : [],
      })
    }
    if (categorized.tool.length) {
      bundles.push({
        kind: 'bundle',
        bundleType: 'tool',
        anchorMessageId: categorized.tool[0]?.id,
        label: 'ツールイベント',
        count: categorized.tool.length,
        events: toolInvocations,
        isSanitizedVariant: sanitized,
        sensitiveFields: sanitized ? [ 'events' ] : [],
      })
    }
    return bundles
  }, [categorized.meta, categorized.tool, metaEvents, toolInvocations, sanitized])

  const events = useMemo(() => [...conversationEvents, ...bundleEvents], [bundleEvents, conversationEvents])

  const bundleSummaries = useMemo<TimelineBundleSummary[]>(() => {
    if (!detail) {
      return []
    }
    const entries: TimelineBundleSummary[] = []
    if (categorized.meta.length) {
      entries.push({
        id: `${detail.sessionId}-meta-bundle`,
        bundleType: 'meta',
        label: 'メタイベント',
        count: categorized.meta.length,
        preview: sanitized ? SANITIZED_PLACEHOLDER : deriveFirstText(categorized.meta),
        anchorMessageId: categorized.meta[0]?.id,
        isSanitizedVariant: sanitized,
      })
    }
    if (categorized.tool.length) {
      entries.push({
        id: `${detail.sessionId}-tool-bundle`,
        bundleType: 'tool',
        label: 'ツールイベント',
        count: categorized.tool.length,
        preview: sanitized ? SANITIZED_PLACEHOLDER : deriveToolPreview(categorized.tool),
        anchorMessageId: categorized.tool[0]?.id,
        isSanitizedVariant: sanitized,
      })
    }
    return entries
  }, [categorized.meta, categorized.tool, detail, sanitized])

  return {
    conversationMessages: categorized.conversation,
    events,
    bundleSummaries,
    hiddenCount,
  }
}

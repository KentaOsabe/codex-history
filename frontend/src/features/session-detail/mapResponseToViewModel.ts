import type {
  SessionDetailResponse,
  SessionMessage,
  SessionVariant,
} from '@/api/types/sessions'

import {
  buildDisplayTitle,
  deriveDownloadUrl,
  deriveLastUpdatedLabel,
  deriveRelativePath,
  formatDateTimeLabel,
} from './formatters'
import { extractIdeContextFromSegments, stripAgentsMdFromSegments, stripEnvironmentContextFromSegments } from './ideContext'

import type {
  RenderedSegment,
  SessionDetailViewModel,
  SessionMessageMetadata,
  SessionMessageViewModel,
  ToolCallViewModel,
} from './types'

const mapSegments = (message: SessionMessage): RenderedSegment[] => {
  if (!Array.isArray(message.segments) || message.segments.length === 0) {
    return []
  }

  return message.segments.map((segment, index) => ({
    id: `${message.id}-segment-${index}`,
    channel: segment.channel ?? 'meta',
    text: segment.text ?? '',
    format: segment.format ?? null,
  }))
}

const mapToolCall = (message: SessionMessage): ToolCallViewModel | undefined => {
  const hasPayload = message.tool_call ?? message.tool_result
  if (!hasPayload) {
    return undefined
  }

  return {
    callId: message.tool_call?.call_id ?? message.tool_result?.call_id,
    name: message.tool_call?.name,
    argumentsText: message.tool_call?.arguments,
    argumentsJson: message.tool_call?.arguments_json,
    status: message.tool_call?.status,
    resultText: message.tool_result?.output,
    resultJson: message.tool_result?.output_json,
  }
}

const computeChecksum = (value: string): string => {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const extractEncryptedReasoningContent = (message: SessionMessage): string | undefined => {
  const raw = message.raw
  if (!raw || typeof raw !== 'object') return undefined

  const payloadType = (raw as { payload_type?: unknown }).payload_type
  const encryptedContent = (raw as { encrypted_content?: unknown }).encrypted_content

  if (typeof payloadType !== 'string' || typeof encryptedContent !== 'string') {
    return undefined
  }

  if (payloadType.toLowerCase() !== 'reasoning') {
    return undefined
  }

  const trimmed = encryptedContent.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const mapMessage = (message: SessionMessage): SessionMessageViewModel => {
  let segments = mapSegments(message)
  const encryptedContent = extractEncryptedReasoningContent(message)
  let metadata = ((message as { metadata?: Record<string, unknown> }).metadata ?? undefined) as
    | SessionMessageMetadata
    | undefined

  if (message.role === 'user' && segments.length) {
    const environmentSanitized = stripEnvironmentContextFromSegments(segments)
    segments = environmentSanitized.sanitizedSegments

    const sanitized = stripAgentsMdFromSegments(segments)
    segments = sanitized.sanitizedSegments

    const ideContextExtraction = extractIdeContextFromSegments(segments)
    if (ideContextExtraction) {
      segments = ideContextExtraction.sanitizedSegments
      metadata = {
        ...(metadata ?? {}),
        ideContext: {
          sections: ideContextExtraction.sections,
        },
      }
    }
  }

  const channel = segments[0]?.channel ?? 'meta'

  return {
    id: message.id,
    timestampIso: message.timestamp ?? undefined,
    timestampLabel: formatDateTimeLabel(message.timestamp),
    role: message.role,
    sourceType: message.source_type,
    channel,
    segments,
    toolCall: mapToolCall(message),
    isEncryptedReasoning: Boolean(encryptedContent),
    encryptedChecksum: encryptedContent ? computeChecksum(encryptedContent) : undefined,
    encryptedLength: encryptedContent?.length,
    raw: message.raw ?? undefined,
    metadata,
  }
}

export const mapResponseToViewModel = (
  response: SessionDetailResponse,
  variant: SessionVariant,
): SessionDetailViewModel => {
  const attributes = response.data.attributes
  const meta = response.meta

  return {
    sessionId: attributes.session_id,
    title: buildDisplayTitle(attributes),
    variant,
    sanitizedAvailable: attributes.has_sanitized_variant ?? false,
    stats: {
      messageCount: attributes.message_count,
      reasoningCount: attributes.reasoning_count,
      toolCallCount: attributes.tool_call_count,
      durationSeconds: attributes.duration_seconds,
      completedAtLabel: formatDateTimeLabel(attributes.completed_at ?? attributes.created_at),
    },
    meta: {
      relativePath: deriveRelativePath(attributes, meta),
      downloadUrl: deriveDownloadUrl(meta),
      lastUpdatedLabel: deriveLastUpdatedLabel(meta, attributes),
    },
    messages: attributes.messages.map(mapMessage),
  }
}

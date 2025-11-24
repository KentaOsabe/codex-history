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
import {
  extractIdeContextFromSegments,
  normalizeIdeContextHeading,
  stripAgentsMdFromSegments,
  stripEnvironmentContextFromSegments,
} from './ideContext'

import type {
  RenderedSegment,
  SessionDetailViewModel,
  SessionMessageMetadata,
  MessageOption,
  SessionMessageViewModel,
  ToolCallViewModel,
} from './types'

const MY_REQUEST_SECTION_KEY = 'my-request-for-codex'

const dropIdeContextFromMetadata = (metadata?: SessionMessageMetadata): SessionMessageMetadata | undefined => {
  if (!metadata) {
    return undefined
  }
  const { ideContext, ...rest } = metadata
  void ideContext
  return Object.keys(rest).length ? rest : undefined
}

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
  let options: MessageOption[] | undefined

  if (message.role === 'user' && segments.length) {
    const environmentSanitized = stripEnvironmentContextFromSegments(segments)
    segments = environmentSanitized.sanitizedSegments

    const sanitized = stripAgentsMdFromSegments(segments)
    segments = sanitized.sanitizedSegments

    const ideContextExtraction = extractIdeContextFromSegments(segments)
    if (ideContextExtraction) {
      segments = ideContextExtraction.sanitizedSegments

      const remainingSections: typeof ideContextExtraction.sections = []
      let requestContent: string | undefined

      ideContextExtraction.sections.forEach((section) => {
        const key = normalizeIdeContextHeading(section.heading)
        if (key === MY_REQUEST_SECTION_KEY) {
          requestContent = section.content?.trim() || requestContent
          return
        }
        remainingSections.push(section)
      })

      if (requestContent && requestContent.length > 0) {
        const primarySegment: RenderedSegment = {
          id: `${message.id}-primary`,
          channel: 'input',
          text: requestContent,
          format: 'plain',
        }
        segments = [primarySegment, ...segments]
      }

      if (remainingSections.length) {
        options = remainingSections.map((section, index) => ({
          id: `${message.id}-option-${index}`,
          label: section.heading,
          value: section.content,
        }))
      }

      metadata = dropIdeContextFromMetadata(metadata)
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
    options,
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

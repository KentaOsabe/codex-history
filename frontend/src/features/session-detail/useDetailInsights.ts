import { useMemo } from 'react'

import type {
  MetaEventEntry,
  MetaEventGroup,
  MetaEventGroupKey,
  SessionDetailViewModel,
  SessionMessageViewModel,
  ToolInvocationGroup,
  ToolInvocationStatus,
} from './types'

interface ToolInvocationAccumulator {
  key: string
  callId?: string
  fallbackId: string
  order: number
  name?: string
  startedAtLabel?: string
  startedAtIso?: string | null
  completedAtLabel?: string
  completedAtIso?: string | null
  argumentsValue?: unknown
  resultValue?: unknown
  argumentsLabel?: string
  resultLabel?: string
  statuses: Array<string | null | undefined>
  hasResult: boolean
}

const SUCCESS_STATUS = new Set([ 'completed', 'success', 'succeeded', 'ok' ])
const ERROR_STATUS = new Set([ 'error', 'failed', 'errored', 'cancelled' ])

const toTimestamp = (value?: string | null): number | undefined => {
  if (!value) return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const deriveStatus = (candidateStatuses: Array<string | null | undefined>, hasResult: boolean): ToolInvocationStatus => {
  for (const candidate of candidateStatuses) {
    const normalized = candidate?.toLowerCase()
    if (!normalized) continue
    if (ERROR_STATUS.has(normalized)) {
      return 'error'
    }
    if (SUCCESS_STATUS.has(normalized)) {
      return 'success'
    }
  }

  if (hasResult) {
    return 'success'
  }

  return 'pending'
}

const formatCallId = (callId?: string, fallbackId?: string): string => {
  if (callId && callId.trim().length > 0) {
    return callId
  }
  return fallbackId ?? 'call_id未設定'
}

const META_GROUP_LABELS: Record<MetaEventGroupKey, string> = {
  token_count: 'トークンカウント',
  agent_reasoning: 'Agent Reasoning',
  environment_context: '環境コンテキスト',
  plain: 'プレーンメッセージ',
  other: 'その他',
}

const META_GROUP_ORDER: MetaEventGroupKey[] = [
  'token_count',
  'agent_reasoning',
  'environment_context',
  'plain',
  'other',
]

const TOKEN_COUNT_KINDS = new Set([ 'token_count', 'token_usage', 'token-stats' ])
const AGENT_REASONING_KINDS = new Set([ 'agent_reasoning', 'reasoning', 'agent_thinking' ])
const ENVIRONMENT_CONTEXT_KINDS = new Set([ 'environment_context', 'environment', 'env_context' ])
const PLAIN_KINDS = new Set([ 'plain', 'agent_message' ])

const numberFormatter = new Intl.NumberFormat('ja-JP')

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const firstNonEmptyString = (...candidates: Array<unknown>): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }
  return undefined
}

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const extractPayloadObject = (raw?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!isRecord(raw)) return undefined
  const nested = (raw as { payload?: unknown }).payload
  if (isRecord(nested)) {
    return nested
  }
  return raw
}

const extractMetaKind = (message: SessionMessageViewModel): string => {
  const metadataKind = isRecord(message.metadata) ? firstNonEmptyString((message.metadata as { event_kind?: unknown }).event_kind) : undefined
  const raw = message.raw
  const rawKind = isRecord(raw) ? firstNonEmptyString((raw as { payload_type?: unknown }).payload_type) : undefined
  const payload = extractPayloadObject(raw)
  const payloadKind = payload ? firstNonEmptyString((payload as { kind?: unknown }).kind) : undefined
  const payloadType = payload ? firstNonEmptyString((payload as { type?: unknown }).type) : undefined
  const fallback = firstNonEmptyString(message.sourceType)
  return (metadataKind ?? payloadKind ?? rawKind ?? payloadType ?? fallback ?? 'other').toLowerCase()
}

const mapKindToGroupKey = (kind: string): MetaEventGroupKey => {
  if (TOKEN_COUNT_KINDS.has(kind)) return 'token_count'
  if (AGENT_REASONING_KINDS.has(kind)) return 'agent_reasoning'
  if (ENVIRONMENT_CONTEXT_KINDS.has(kind)) return 'environment_context'
  if (PLAIN_KINDS.has(kind)) return 'plain'
  return 'other'
}

const formatCount = (value: number): string => numberFormatter.format(value)

const deriveTokenStats = (payload?: Record<string, unknown>) => {
  if (!payload) {
    return { summary: undefined, stats: undefined }
  }
  const info = isRecord(payload.info) ? (payload.info as Record<string, unknown>) : undefined
  const input = coerceNumber(info?.prompt_tokens ?? payload.prompt_tokens ?? payload.input_tokens)
  const output = coerceNumber(info?.completion_tokens ?? payload.completion_tokens ?? payload.output_tokens)
  const totalCandidate = coerceNumber(payload.total ?? info?.total)
  const total = typeof totalCandidate === 'number'
    ? totalCandidate
    : typeof input === 'number' && typeof output === 'number'
      ? input + output
      : undefined

  const parts: string[] = []
  if (typeof input === 'number') parts.push(`入力: ${formatCount(input)}`)
  if (typeof output === 'number') parts.push(`出力: ${formatCount(output)}`)
  if (typeof total === 'number') parts.push(`合計: ${formatCount(total)}`)

  const hasStats = typeof input === 'number' || typeof output === 'number' || typeof total === 'number'

  return {
    summary: parts.join(' / ') || undefined,
    stats: hasStats
      ? {
          inputTokens: input,
          outputTokens: output,
          totalTokens: total,
        }
      : undefined,
  }
}

interface MetaEventAccumulatorEntry extends MetaEventEntry {
  sortKey: number
}

const buildMetaEventEntry = (
  detail: SessionDetailViewModel,
  message: SessionMessageViewModel,
  groupKey: MetaEventGroupKey,
  normalizedKind: string,
  order: number,
): MetaEventAccumulatorEntry => {
  const payload = extractPayloadObject(message.raw)
  const timestampMs = toTimestamp(message.timestampIso)
  const segmentsText = firstNonEmptyString(message.segments[0]?.text)

  const entry: MetaEventAccumulatorEntry = {
    id: `${detail.sessionId}-${message.id}`,
    timestampLabel: message.timestampLabel,
    summary: '',
    payloadJson: payload ?? message.raw,
    sortKey: typeof timestampMs === 'number' ? timestampMs : order,
  }

  if (groupKey === 'token_count') {
    const { summary, stats } = deriveTokenStats(payload)
    entry.summary = summary ?? `token_count (${normalizedKind})`
    if (stats) {
      entry.tokenStats = stats
    }
    return entry
  }

  if (groupKey === 'agent_reasoning') {
    const encryptedFlag = Boolean(
      (payload as { encrypted?: unknown })?.encrypted ??
        (payload as { is_encrypted?: unknown })?.is_encrypted ??
        (payload as { ciphertext?: unknown })?.ciphertext,
    )
    if (encryptedFlag) {
      const checksum = firstNonEmptyString(
        (payload as { checksum?: unknown })?.checksum,
        (payload as { hash?: unknown })?.hash,
        message.encryptedChecksum,
      )
      const length = coerceNumber((payload as { length?: unknown })?.length ?? message.encryptedLength)
      entry.summary = '暗号化された reasoning が記録されています'
      entry.encryptedInfo = {
        checksum: checksum ?? undefined,
        length: length ?? undefined,
      }
    } else {
      entry.summary =
        firstNonEmptyString(
          (payload as { text?: unknown })?.text,
          (payload as { content?: unknown })?.content,
          (payload as { message?: unknown })?.message,
          segmentsText,
        ) ?? `agent_reasoning (${normalizedKind})`
    }
    return entry
  }

  if (groupKey === 'environment_context') {
    entry.summary =
      firstNonEmptyString(
        (payload as { context?: unknown })?.context,
        (payload as { summary?: unknown })?.summary,
        (payload as { description?: unknown })?.description,
        segmentsText,
      ) ?? '環境コンテキストの更新'
    return entry
  }

  if (groupKey === 'plain') {
    entry.summary = firstNonEmptyString((payload as { text?: unknown })?.text, segmentsText) ?? 'メタイベント'
    return entry
  }

  entry.summary = firstNonEmptyString((payload as { summary?: unknown })?.summary, segmentsText)
    ?? `kind: ${normalizedKind}`
  return entry
}

export const useDetailInsights = (detail?: SessionDetailViewModel) => {
  const toolInvocations = useMemo<ToolInvocationGroup[]>(() => {
    if (!detail) {
      return []
    }

    const entries = new Map<string, ToolInvocationAccumulator>()

    detail.messages.forEach((message, index) => {
      if (!message.toolCall) return

      const bucketKey = message.toolCall.callId ?? message.id
      let entry = entries.get(bucketKey)
      if (!entry) {
        entry = {
          key: bucketKey,
          fallbackId: message.id,
          order: index,
          statuses: [],
          hasResult: false,
        }
        entries.set(bucketKey, entry)
      }

      entry.callId = message.toolCall.callId ?? entry.callId
      entry.name = entry.name ?? message.toolCall.name
      entry.argumentsLabel = '引数'
      entry.resultLabel = '出力'

      if (message.sourceType === 'tool_call') {
        entry.startedAtLabel = message.timestampLabel ?? entry.startedAtLabel
        entry.startedAtIso = message.timestampIso ?? entry.startedAtIso
        entry.argumentsValue = message.toolCall.argumentsJson ?? message.toolCall.argumentsText ?? entry.argumentsValue
      }

      if (message.sourceType === 'tool_result') {
        entry.completedAtLabel = message.timestampLabel ?? entry.completedAtLabel
        entry.completedAtIso = message.timestampIso ?? entry.completedAtIso
        entry.resultValue = message.toolCall.resultJson ?? message.toolCall.resultText ?? entry.resultValue
        entry.hasResult = true
      }

      entry.statuses.push(message.toolCall.status)
    })

    const groups: ToolInvocationGroup[] = Array.from(entries.values())
      .map((entry) => {
        const startMs = toTimestamp(entry.startedAtIso)
        const endMs = toTimestamp(entry.completedAtIso)
        const durationMs =
          typeof startMs === 'number' && typeof endMs === 'number' && endMs >= startMs ? endMs - startMs : undefined
        const status = deriveStatus(entry.statuses, entry.hasResult)
        const callId = formatCallId(entry.callId, entry.fallbackId)

        if (!entry.hasResult && typeof console !== 'undefined' && typeof console.debug === 'function') {
          console.debug('[useDetailInsights] tool invocation is pending: %s', callId)
        }

        return {
          id: `${detail.sessionId}-${entry.key}`,
          callId,
          name: entry.name,
          status,
          startedAtLabel: entry.startedAtLabel,
          completedAtLabel: entry.completedAtLabel,
          durationMs,
          argumentsValue: entry.argumentsValue,
          argumentsLabel: entry.argumentsLabel,
          resultValue: entry.resultValue,
          resultLabel: entry.resultLabel,
          sortKey: typeof startMs === 'number' ? startMs : typeof endMs === 'number' ? endMs : entry.order,
        }
      })
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ sortKey, ...group }) => group)

    return groups
  }, [detail])

  const metaEvents = useMemo<MetaEventGroup[]>(() => {
    if (!detail) {
      return []
    }

    const grouped = new Map<MetaEventGroupKey, MetaEventAccumulatorEntry[]>()

    detail.messages.forEach((message, index) => {
      if (message.sourceType !== 'meta') {
        return
      }
      const normalizedKind = extractMetaKind(message)
      const groupKey = mapKindToGroupKey(normalizedKind)
      const entry = buildMetaEventEntry(detail, message, groupKey, normalizedKind, index)
      const bucket = grouped.get(groupKey)
      if (bucket) {
        bucket.push(entry)
      } else {
        grouped.set(groupKey, [ entry ])
      }
    })

    return META_GROUP_ORDER.map((key) => {
      const entries = grouped.get(key)
      if (!entries || !entries.length) {
        return null
      }
      const sortedEvents = entries
        .slice()
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ sortKey, ...event }) => event)
      return {
        key,
        label: META_GROUP_LABELS[key],
        events: sortedEvents,
      }
    }).filter(Boolean) as MetaEventGroup[]
  }, [detail])

  return {
    toolInvocations,
    metaEvents,
  }
}

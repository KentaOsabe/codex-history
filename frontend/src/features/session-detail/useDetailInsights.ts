import { useMemo } from 'react'

import type { SessionDetailViewModel, ToolInvocationGroup, ToolInvocationStatus } from './types'

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

  return {
    toolInvocations,
  }
}

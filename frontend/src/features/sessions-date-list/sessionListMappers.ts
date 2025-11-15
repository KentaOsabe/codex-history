import type { SessionsIndexResponse } from '@/api/types/sessions'

import { formatDateTime } from './dateUtils'

import type { SessionListItem } from './SessionCard'

const extractSummary = (payload: Record<string, unknown> | undefined | null): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined
  const summary = (payload as { summary?: unknown }).summary
  return typeof summary === 'string' && summary.trim().length > 0 ? summary : undefined
}

export const mapSessionsToListItems = (response?: SessionsIndexResponse): SessionListItem[] => {
  if (!response) return []

  return response.data.map((session) => {
    const attributes = session.attributes
    const fallbackLabel = attributes.relative_path ?? attributes.session_id
    const title = attributes.title?.trim().length ? attributes.title : fallbackLabel
    const updatedAtLabel = formatDateTime(attributes.completed_at ?? attributes.created_at)
    const summaryCandidate = extractSummary(attributes.raw_session_meta as Record<string, unknown> | undefined)

    return {
      id: session.id,
      title,
      fallbackLabel,
      updatedAtLabel,
      messageCount: attributes.message_count,
      summary: summaryCandidate,
      hasSanitized: attributes.has_sanitized_variant,
    }
  })
}

export const deriveLastUpdatedLabel = (response?: SessionsIndexResponse): string | undefined => {
  const updatedAt = (response?.meta as { index?: { updated_at?: string } })?.index?.updated_at
  return updatedAt ? formatDateTime(updatedAt) : undefined
}

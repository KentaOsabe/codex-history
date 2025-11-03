import { useCallback, useEffect, useMemo, useState } from 'react'

import type { SessionsIndexResponse } from '@/api/types/sessions'

import { toISODate } from './dateUtils'
import { useSearchDraft } from './useSearchDraft'
import { useSessionsByDate } from './useSessionsByDate'

import type { SessionListItem } from './SessionCard'

type ViewStatus = 'idle' | 'loading' | 'success' | 'error'

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return ''

  const dt = new Date(iso)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(dt)
}

const extractSummary = (payload: Record<string, unknown> | undefined | null): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined
  const summary = (payload as { summary?: unknown }).summary
  return typeof summary === 'string' && summary.trim().length > 0 ? summary : undefined
}

const mapSessionsToListItems = (response?: SessionsIndexResponse): SessionListItem[] => {
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

const deriveLastUpdatedLabel = (response?: SessionsIndexResponse): string | undefined => {
  const updatedAt = (response?.meta as { index?: { updated_at?: string } })?.index?.updated_at
  return updatedAt ? formatDateTime(updatedAt) : undefined
}

export interface SessionsViewModel {
  activeDateIso: string
  setActiveDateIso: (next: string) => void
  status: ViewStatus
  items: SessionListItem[]
  error?: unknown
  searchDraft: string
  setSearchDraft: (value: string) => void
  lastUpdatedLabel?: string
  refetch: (options?: { force?: boolean }) => Promise<void>
}

export const useSessionsViewModel = (): SessionsViewModel => {
  const todayIso = useMemo(() => toISODate(new Date()), [])
  const [activeDateIso, updateActiveDateIso] = useState(todayIso)
  const { status, data, error, refetch } = useSessionsByDate({ dateIso: activeDateIso })
  const [searchDraft, setSearchDraft] = useSearchDraft('')
  const [lastSuccessfulResponse, setLastSuccessfulResponse] = useState<SessionsIndexResponse | undefined>(undefined)

  useEffect(() => {
    if (status === 'success' && data) {
      setLastSuccessfulResponse((previous) => (previous === data ? previous : data))
    }
  }, [status, data])

  const effectiveResponse = status === 'success' && data ? data : lastSuccessfulResponse

  const items = useMemo(() => mapSessionsToListItems(effectiveResponse), [effectiveResponse])
  const lastUpdatedLabel = useMemo(() => deriveLastUpdatedLabel(effectiveResponse), [effectiveResponse])

  const handleRefetch = useCallback(
    async (options?: { force?: boolean }) => {
      await refetch(options)
    },
    [refetch],
  )

  const handleSetActiveDateIso = useCallback((next: string) => {
    updateActiveDateIso(next)
  }, [])

  return {
    activeDateIso,
    setActiveDateIso: handleSetActiveDateIso,
    status,
    items,
    error,
    searchDraft,
    setSearchDraft,
    lastUpdatedLabel,
    refetch: handleRefetch,
  }
}

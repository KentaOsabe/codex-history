import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { SessionDetailViewModel } from './types'

export type TimelineLoadDirection = 'prev' | 'next'

interface TimelineLoadControllerParams {
  detail?: SessionDetailViewModel
  cooldownMs?: number
  onLoad?: (direction: TimelineLoadDirection) => void
}

type DirectionState = Record<TimelineLoadDirection, number>

const DIRECTIONS: TimelineLoadDirection[] = [ 'prev', 'next' ]

const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now())

export const useTimelineLoadController = ({ detail, cooldownMs = 1200, onLoad }: TimelineLoadControllerParams) => {
  const deliveredCount = detail?.messages.length ?? 0
  const totalMessages = detail?.stats.messageCount ?? deliveredCount
  const hasMore = Boolean(detail && totalMessages > deliveredCount)
  const cooldownUntilRef = useRef<DirectionState>({ prev: 0, next: 0 })
  const deliveredAtRequestRef = useRef<Record<TimelineLoadDirection, number | null>>({ prev: null, next: null })
  const lastSessionIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!detail) {
      cooldownUntilRef.current = { prev: 0, next: 0 }
      deliveredAtRequestRef.current = { prev: null, next: null }
      lastSessionIdRef.current = undefined
      return
    }

    if (detail.sessionId !== lastSessionIdRef.current) {
      lastSessionIdRef.current = detail.sessionId
      cooldownUntilRef.current = { prev: 0, next: 0 }
      deliveredAtRequestRef.current = { prev: null, next: null }
    }
  }, [detail])

  useEffect(() => {
    DIRECTIONS.forEach((direction) => {
      const requestedCount = deliveredAtRequestRef.current[direction]
      if (requestedCount == null) {
        return
      }
      if (deliveredCount > requestedCount) {
        cooldownUntilRef.current[direction] = 0
        deliveredAtRequestRef.current[direction] = deliveredCount
      }
    })
  }, [deliveredCount])

  const canLoadPrev = useMemo(() => hasMore, [hasMore])
  const canLoadNext = canLoadPrev

  const requestLoad = useCallback(
    (direction: TimelineLoadDirection) => {
      if (!detail || !onLoad) {
        return
      }
      const allow = direction === 'prev' ? canLoadPrev : canLoadNext
      if (!allow) {
        return
      }
      const currentTime = now()
      if (cooldownUntilRef.current[direction] > currentTime) {
        return
      }
      deliveredAtRequestRef.current[direction] = deliveredCount
      cooldownUntilRef.current[direction] = currentTime + cooldownMs
      onLoad(direction)
    },
    [canLoadPrev, canLoadNext, cooldownMs, deliveredCount, detail, onLoad],
  )

  return {
    canLoadPrev,
    canLoadNext,
    requestLoad,
  }
}

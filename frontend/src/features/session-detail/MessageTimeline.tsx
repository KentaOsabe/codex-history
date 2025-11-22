import { useVirtualizer } from '@tanstack/react-virtual'
import { forwardRef, type ForwardedRef, useCallback, useEffect, useMemo, useRef } from 'react'

import MessageCard from './MessageCard'
import styles from './MessageTimeline.module.css'

import type {
  IdeContextPreferenceState,
  ScrollAnchorSnapshot,
  SessionMessageViewModel,
  TimelineDisplayMode,
} from './types'
import type { TimelineLoadDirection } from './useTimelineLoadController'


interface MessageTimelineProps {
  messages: SessionMessageViewModel[]
  className?: string
  virtualizationThreshold?: number
  canLoadPrev?: boolean
  canLoadNext?: boolean
  onRequestLoad?: (direction: TimelineLoadDirection) => void
  onScrollAnchorChange?: (snapshot: ScrollAnchorSnapshot) => void
  highlightedIds?: string[]
  ideContextPreference?: IdeContextPreferenceState
  displayMode?: TimelineDisplayMode
}

const VIRTUALIZATION_THRESHOLD = 120
const VIRTUALIZER_OVERSCAN = 8
const DEFAULT_INITIAL_RECT = { width: 1024, height: 768 }
const EDGE_THRESHOLD_PX = 8

const ESTIMATED_HEIGHT_BY_ROLE: Record<SessionMessageViewModel['role'], number> = {
  user: 140,
  assistant: 170,
  tool: 180,
  system: 150,
  meta: 110,
}

const estimateMessageHeight = (message?: SessionMessageViewModel): number => {
  if (!message) return 140
  const segmentsBonus = Math.min(message.segments.length, 4) * 28
  const toolCallBonus = message.toolCall ? 140 : 0
  const reasoningBonus = message.isEncryptedReasoning ? 60 : 0
  return ESTIMATED_HEIGHT_BY_ROLE[message.role] + segmentsBonus + toolCallBonus + reasoningBonus + 16
}

const assignRef = (target: ForwardedRef<HTMLDivElement>, node: HTMLDivElement | null): void => {
  if (typeof target === 'function') {
    target(node)
  } else if (target) {
    target.current = node
  }
}

const MessageTimeline = forwardRef<HTMLDivElement, MessageTimelineProps>(
  (
    {
      messages,
      className,
      virtualizationThreshold = VIRTUALIZATION_THRESHOLD,
      canLoadPrev = false,
      canLoadNext = false,
      onRequestLoad,
      onScrollAnchorChange,
      highlightedIds,
      ideContextPreference,
      displayMode = 'full',
    },
    forwardedRef,
  ) => {
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const edgeStateRef = useRef({ top: false, bottom: false })

    const combinedClassName = useMemo(() => {
      return [styles.timeline, className].filter(Boolean).join(' ')
    }, [className])

    const shouldVirtualize = messages.length > virtualizationThreshold
    const highlightedSet = useMemo(() => new Set(highlightedIds ?? []), [highlightedIds])

    const estimateSize = useCallback((index: number) => estimateMessageHeight(messages[index]), [messages])
    const getItemKey = useCallback(
      (index: number) => messages[index]?.id ?? `virtual-message-${index}`,
      [messages],
    )

    const virtualizer = useVirtualizer({
      count: shouldVirtualize ? messages.length : 0,
      getScrollElement: () => viewportRef.current,
      estimateSize,
      getItemKey,
      overscan: VIRTUALIZER_OVERSCAN,
      initialRect: DEFAULT_INITIAL_RECT,
    })

    const virtualItems = useMemo(() => {
      return shouldVirtualize ? virtualizer.getVirtualItems() : []
    }, [shouldVirtualize, virtualizer])

    const canTriggerLoad = useCallback(
      (edge: 'top' | 'bottom') => {
        if (!shouldVirtualize) {
          return false
        }
        return edge === 'top' ? canLoadPrev : canLoadNext
      },
      [canLoadNext, canLoadPrev, shouldVirtualize],
    )

    const updateEdgeState = useCallback(
      (edge: 'top' | 'bottom', active: boolean) => {
        if (!onRequestLoad) {
          edgeStateRef.current[edge] = active
          return
        }
        if (!canTriggerLoad(edge)) {
          edgeStateRef.current[edge] = false
          return
        }
        const previous = edgeStateRef.current[edge]
        if (active && !previous) {
          edgeStateRef.current[edge] = true
          onRequestLoad(edge === 'top' ? 'prev' : 'next')
        } else if (!active && previous) {
          edgeStateRef.current[edge] = false
        }
      },
      [canTriggerLoad, onRequestLoad],
    )

    const emitAnchorSnapshot = useCallback(() => {
      if (!onScrollAnchorChange) return
      const element = viewportRef.current
      const snapshot = buildAnchorSnapshot(element)
      if (snapshot) {
        onScrollAnchorChange(snapshot)
      }
    }, [onScrollAnchorChange])

    const evaluateEdgesFromScroll = useCallback(
      (element: HTMLDivElement) => {
        const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 1)
        const nearTop = element.scrollTop <= EDGE_THRESHOLD_PX
        const nearBottom = element.scrollTop >= maxScroll - EDGE_THRESHOLD_PX
        updateEdgeState('top', nearTop)
        updateEdgeState('bottom', nearBottom || maxScroll <= EDGE_THRESHOLD_PX)
      },
      [updateEdgeState],
    )

    const evaluateEdgesFromVirtualItems = useCallback(
      (items: ReturnType<typeof virtualizer.getVirtualItems>) => {
        if (!shouldVirtualize || items.length === 0) {
          return
        }
        const firstIndex = items[0]?.index ?? 0
        const lastIndex = items[items.length - 1]?.index ?? 0
        updateEdgeState('top', firstIndex === 0)
        updateEdgeState('bottom', lastIndex >= messages.length - 1)
      },
      [messages.length, shouldVirtualize, updateEdgeState, virtualizer],
    )

    const setViewportRef = useCallback(
      (node: HTMLDivElement | null) => {
        viewportRef.current = node
        if (forwardedRef) {
          assignRef(forwardedRef, node)
        }
        if (node) {
          const anchor = buildAnchorSnapshot(node)
          if (anchor && onScrollAnchorChange) {
            onScrollAnchorChange(anchor)
          }
          evaluateEdgesFromScroll(node)
        }
      },
      [forwardedRef, onScrollAnchorChange, evaluateEdgesFromScroll],
    )

    useEffect(() => {
      const element = viewportRef.current
      if (!element) return
      const handleScroll = () => {
        emitAnchorSnapshot()
        evaluateEdgesFromScroll(element)
      }
      element.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        element.removeEventListener('scroll', handleScroll)
      }
    }, [emitAnchorSnapshot, evaluateEdgesFromScroll])

    useEffect(() => {
      evaluateEdgesFromVirtualItems(virtualItems)
    }, [evaluateEdgesFromVirtualItems, virtualItems])

    useEffect(() => {
      emitAnchorSnapshot()
    }, [emitAnchorSnapshot, messages.length])

    if (messages.length === 0) {
      return (
        <div
          ref={setViewportRef}
          className={combinedClassName}
          data-virtualized="false"
          aria-live="polite"
        >
          <div className={styles.empty}>このセッションには表示できるメッセージがありません。</div>
        </div>
      )
    }

    if (!shouldVirtualize) {
      return (
        <div
          ref={setViewportRef}
          className={combinedClassName}
          data-virtualized="false"
          aria-live="polite"
        >
          <div className={styles.list}>
            {messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                isHighlighted={highlightedSet.has(message.id)}
                ideContextPreference={ideContextPreference}
                displayMode={displayMode}
              />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div
        ref={setViewportRef}
        className={combinedClassName}
        data-virtualized="true"
        aria-live="polite"
      >
        <div className={styles.virtualizerInner} style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualItems.map((virtualRow) => {
            const message = messages[virtualRow.index]
            const isHighlighted = highlightedSet.has(message.id)
            return (
              <div
                key={(virtualRow.key ?? messages[virtualRow.index]?.id ?? virtualRow.index).toString()}
                className={styles.virtualRow}
                ref={(node) => {
                  if (node) {
                    virtualizer.measureElement(node)
                  }
                }}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
                data-index={virtualRow.index}
              >
                <MessageCard
                  message={message}
                  isHighlighted={isHighlighted}
                  ideContextPreference={ideContextPreference}
                  displayMode={displayMode}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)

MessageTimeline.displayName = 'MessageTimeline'

export default MessageTimeline

const buildAnchorSnapshot = (element: HTMLDivElement | null): ScrollAnchorSnapshot | null => {
  if (!element) return null
  const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 1)
  if (!Number.isFinite(maxScroll) || maxScroll <= 0) {
    return { offsetRatio: 0, absoluteOffset: 0 }
  }
  return {
    offsetRatio: element.scrollTop / maxScroll,
    absoluteOffset: element.scrollTop,
  }
}

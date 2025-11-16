import { useEffect, useRef, useState } from 'react'

import SanitizedJsonViewer from './SanitizedJsonViewer'
import styles from './ToolInvocationTimeline.module.css'

import type { SanitizedViewerMode, ToolInvocationGroup } from './types'

interface ToolInvocationTimelineProps {
  toolInvocations: ToolInvocationGroup[]
  sessionId?: string
  viewerMode?: SanitizedViewerMode
}

const STATUS_LABELS: Record<ToolInvocationGroup['status'], string> = {
  success: '成功',
  error: '失敗',
  pending: '進行中',
}

const formatDuration = (durationMs?: number): string | null => {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs)) {
    return null
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`
  }
  return `${(durationMs / 1000).toFixed(1)}秒`
}

type InvocationCollapseState = Record<string, { argumentsExpanded: boolean; resultExpanded: boolean }>

const ToolInvocationTimeline = ({ toolInvocations, sessionId, viewerMode = 'default' }: ToolInvocationTimelineProps) => {
  const collapseStateRef = useRef<InvocationCollapseState>({})
  const [, setVersion] = useState(0)

  useEffect(() => {
    collapseStateRef.current = {}
    setVersion((prev) => prev + 1)
  }, [sessionId])

  const getInvocationState = (invocationId: string) => {
    const entry = collapseStateRef.current[invocationId]
    if (entry) {
      return entry
    }
    const next = { argumentsExpanded: false, resultExpanded: false }
    collapseStateRef.current[invocationId] = next
    return next
  }

  const handleExpandedChange = (invocationId: string, key: 'argumentsExpanded' | 'resultExpanded', next: boolean) => {
    const entry = getInvocationState(invocationId)
    if (entry[key] === next) {
      return
    }
    entry[key] = next
    setVersion((prev) => prev + 1)
  }

  if (!toolInvocations.length) {
    return <p className={styles.emptyMessage}>ツール呼び出しイベントはまだありません</p>
  }

  return (
    <ol className={styles.timeline} data-testid="tool-invocation-timeline">
      {toolInvocations.map((invocation) => {
        const metaItems = [
          { label: '開始', value: invocation.startedAtLabel },
          { label: '終了', value: invocation.completedAtLabel },
          { label: '所要時間', value: formatDuration(invocation.durationMs) },
        ].filter((item) => Boolean(item.value)) as { label: string; value: string }[]

        const invocationState = getInvocationState(invocation.id)

        return (
          <li key={invocation.id} className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{invocation.name ?? 'ツール呼び出し'}</h3>
                <p className={styles.callId}>
                  Call ID: <code>{invocation.callId}</code>
                </p>
              </div>
              <span className={`${styles.statusBadge} ${styles[`status-${invocation.status}`]}`}>
                {STATUS_LABELS[invocation.status]}
              </span>
            </header>

            {metaItems.length ? (
              <ul className={styles.metaList}>
                {metaItems.map((item) => (
                  <li key={`${invocation.id}-${item.label}`}>
                    <span className={styles.metaLabel}>{item.label}</span>{' '}
                    <span className={styles.metaValue}>{item.value}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className={styles.payloadGrid}>
              <SanitizedJsonViewer
                id={`${invocation.id}-arguments`}
                label={invocation.argumentsLabel ?? '引数'}
                value={invocation.argumentsValue}
                expanded={invocationState.argumentsExpanded}
                onExpandedChange={(nextExpanded) => handleExpandedChange(invocation.id, 'argumentsExpanded', nextExpanded)}
                mode={viewerMode}
              />

              {invocation.resultValue !== undefined ? (
                <SanitizedJsonViewer
                  id={`${invocation.id}-result`}
                  label={invocation.resultLabel ?? '出力'}
                  value={invocation.resultValue}
                  expanded={invocationState.resultExpanded}
                  onExpandedChange={(nextExpanded) => handleExpandedChange(invocation.id, 'resultExpanded', nextExpanded)}
                  mode={viewerMode}
                />
              ) : (
                <div className={styles.emptyPayload} aria-live="polite">
                  <p>出力なし</p>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default ToolInvocationTimeline

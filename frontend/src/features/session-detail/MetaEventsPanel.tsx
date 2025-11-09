import { useEffect, useState } from 'react'

import EncryptedReasoningPlaceholder from './EncryptedReasoningPlaceholder'
import SanitizedJsonViewer from './SanitizedJsonViewer'
import styles from './MetaEventsPanel.module.css'
import type { MetaEventGroup } from './types'

interface MetaEventsPanelProps {
  metaEvents: MetaEventGroup[]
}

const MetaEventsPanel = ({ metaEvents }: MetaEventsPanelProps) => {
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setExpandedState((previous) => {
      if (!metaEvents.length) {
        return {}
      }
      const next: Record<string, boolean> = {}
      metaEvents.forEach((group, index) => {
        next[group.key] = typeof previous[group.key] === 'boolean' ? previous[group.key] : index === 0
      })
      return next
    })
  }, [metaEvents])

  if (metaEvents.length === 0) {
    return <p className={styles.placeholder}>メタイベントはまだありません</p>
  }

  const toggleGroup = (key: string) => {
    setExpandedState((previous) => ({
      ...previous,
      [key]: !previous[key],
    }))
  }

  return (
    <div className={styles.panel} data-testid="meta-events-panel">
      {metaEvents.map((group) => {
        const isExpanded = expandedState[group.key] ?? false
        const buttonId = `meta-events-${group.key}-toggle`
        const panelId = `meta-events-${group.key}-panel`
        return (
          <section key={group.key} className={styles.group}>
            <button
              id={buttonId}
              type="button"
              className={styles.groupToggle}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              onClick={() => toggleGroup(group.key)}
            >
              <span className={styles.groupMeta}>
                <span className={styles.groupLabel}>{group.label}</span>
                <span className={styles.groupCount}>{group.events.length}件</span>
              </span>
              <span className={styles.chevron} data-state={isExpanded ? 'expanded' : 'collapsed'} aria-hidden="true">
                ▾
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isExpanded}
              className={styles.groupBody}
            >
              {group.events.map((event) => (
                <article key={event.id} className={styles.eventCard}>
                  <header className={styles.eventHeader}>
                    {event.timestampLabel ? (
                      <p className={styles.eventTimestamp}>{event.timestampLabel}</p>
                    ) : null}
                    <p className={styles.eventSummary}>{event.summary}</p>
                  </header>
                  {group.key === 'token_count' && event.tokenStats ? (
                    <table className={styles.tokenTable} aria-label="トークン内訳">
                      <tbody>
                        {event.tokenStats.inputTokens !== undefined ? (
                          <tr>
                            <th scope="row">入力トークン</th>
                            <td>{event.tokenStats.inputTokens.toLocaleString('ja-JP')}</td>
                          </tr>
                        ) : null}
                        {event.tokenStats.outputTokens !== undefined ? (
                          <tr>
                            <th scope="row">出力トークン</th>
                            <td>{event.tokenStats.outputTokens.toLocaleString('ja-JP')}</td>
                          </tr>
                        ) : null}
                        {event.tokenStats.totalTokens !== undefined ? (
                          <tr>
                            <th scope="row">合計トークン</th>
                            <td>{event.tokenStats.totalTokens.toLocaleString('ja-JP')}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  ) : null}

                  {group.key === 'agent_reasoning' && event.encryptedInfo ? (
                    <EncryptedReasoningPlaceholder
                      checksum={event.encryptedInfo.checksum}
                      length={event.encryptedInfo.length}
                    />
                  ) : (
                    <SanitizedJsonViewer
                      id={`${event.id}-payload`}
                      label="イベントペイロード"
                      value={event.payloadJson}
                    />
                  )}
                </article>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default MetaEventsPanel

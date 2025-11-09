import { useMemo } from 'react'

import styles from './SessionDetailTabs.module.css'

import type { KeyboardEvent } from 'react'


export type SessionDetailTab = 'conversation' | 'details'

interface SessionDetailTabsProps {
  activeTab: SessionDetailTab
  onTabChange: (next: SessionDetailTab) => void
  tabIds: Record<SessionDetailTab, string>
  panelIds: Record<SessionDetailTab, string>
}

interface TabDefinition {
  key: SessionDetailTab
  label: string
  description: string
}

const TAB_DEFINITIONS: TabDefinition[] = [
  {
    key: 'conversation',
    label: '会話',
    description: 'メッセージタイムライン',
  },
  {
    key: 'details',
    label: '詳細',
    description: 'ツール呼び出し / メタイベント',
  },
]

const SessionDetailTabs = ({ activeTab, onTabChange, tabIds, panelIds }: SessionDetailTabsProps) => {
  const orderedTabs = useMemo(() => TAB_DEFINITIONS, [])

  const focusTab = (nextKey: SessionDetailTab) => {
    if (activeTab === nextKey) {
      return
    }
    onTabChange(nextKey)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const delta = event.key === 'ArrowRight' ? 1 : -1
      const nextIndex = (index + delta + orderedTabs.length) % orderedTabs.length
      focusTab(orderedTabs[nextIndex].key)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusTab(orderedTabs[0].key)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusTab(orderedTabs[orderedTabs.length - 1].key)
    }
  }

  return (
    <div className={styles.tabList} role="tablist" aria-label="セッションビューの切り替え">
      {orderedTabs.map((tab, index) => {
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            id={tabIds[tab.key]}
            role="tab"
            type="button"
            aria-controls={panelIds[tab.key]}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
            onClick={() => focusTab(tab.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
            <span className={styles.tabDescription} aria-hidden="true">
              {tab.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default SessionDetailTabs

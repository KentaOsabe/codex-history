import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'

import EncryptedReasoningPlaceholder from './EncryptedReasoningPlaceholder'
import { AGENTS_HEADING_KEY, normalizeIdeContextHeading } from './ideContext'
import styles from './MessageCard.module.css'
import ToolCallPanel from './ToolCallPanel'

import type { IdeContextPreferenceState, IdeContextSection, SessionMessageViewModel, TimelineDisplayMode } from './types'

interface MessageCardProps {
  message: SessionMessageViewModel
  isHighlighted?: boolean
  ideContextPreference?: IdeContextPreferenceState
  displayMode?: TimelineDisplayMode
}

const buildDefaultSectionExpansion = (sections: IdeContextSection[]): Record<string, boolean> => {
  return sections.reduce<Record<string, boolean>>((acc, section) => {
    const key = normalizeIdeContextHeading(section.heading)
    if (!key) {
      return acc
    }
    acc[key] = section.defaultExpanded ?? false
    return acc
  }, {})
}

const ROLE_LABELS: Record<SessionMessageViewModel['role'], string> = {
  user: 'ユーザー',
  assistant: 'アシスタント',
  tool: 'ツール',
  system: 'システム',
  meta: 'メタ',
}

const CHANNEL_LABELS = {
  input: 'Input',
  output: 'Output',
  meta: 'Meta',
} as const

const SOURCE_LABELS: Record<SessionMessageViewModel['sourceType'], string> = {
  message: 'Message',
  tool_call: 'Tool Call',
  tool_result: 'Tool Result',
  meta: 'Meta',
  session: 'Session',
}

const MessageCard = ({
  message,
  isHighlighted = false,
  ideContextPreference,
  displayMode = 'full',
}: MessageCardProps) => {
  const roleClassName = {
    user: styles.roleUser,
    assistant: styles.roleAssistant,
    tool: styles.roleTool,
    system: styles.roleAssistant,
    meta: styles.roleMeta,
  }[message.role]
  const highlightedClass = isHighlighted ? styles.highlighted : ''
  const ideContextSections: IdeContextSection[] = useMemo(() => {
    if (message.role !== 'user') {
      return []
    }
    return (message.metadata?.ideContext?.sections ?? []).filter(
      (section) => normalizeIdeContextHeading(section.heading) !== AGENTS_HEADING_KEY,
    )
  }, [message.metadata?.ideContext?.sections, message.role])
  const hasIdeContext = ideContextSections.length > 0
  const preferenceMap = useMemo(() => {
    if (!ideContextPreference) {
      return new Map<string, boolean>()
    }
    return new Map(ideContextPreference.sections.map((section) => [section.key, section.alwaysVisible] as const))
  }, [ideContextPreference])

  const hasPinnedContext = useMemo(() => {
    for (const value of preferenceMap.values()) {
      if (value) return true
    }
    return false
  }, [preferenceMap])

  const [contextVisible, setContextVisible] = useState(() => hasPinnedContext)

  useEffect(() => {
    if (hasPinnedContext) {
      setContextVisible(true)
      return
    }
    if (!ideContextSections.length) {
      setContextVisible(false)
    }
  }, [hasPinnedContext, ideContextSections.length])

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    buildDefaultSectionExpansion(ideContextSections),
  )

  useEffect(() => {
    setExpandedSections((previous) => {
      const next = { ...previous }
      let changed = false
      const availableKeys = new Set(
        ideContextSections
          .map((section) => normalizeIdeContextHeading(section.heading))
          .filter((key) => key.length > 0),
      )

      Object.keys(next).forEach((key) => {
        if (!availableKeys.has(key)) {
          delete next[key]
          changed = true
        }
      })

      ideContextSections.forEach((section) => {
        const key = normalizeIdeContextHeading(section.heading)
        if (!key) {
          return
        }
        if (!(key in next)) {
          next[key] = section.defaultExpanded ?? false
          changed = true
        }
      })

      return changed ? next : previous
    })
  }, [ideContextSections])

  const handleSectionToggle = (key: string, forced: boolean) => (event: SyntheticEvent<HTMLDetailsElement>) => {
    const target = event.currentTarget
    if (!target) {
      return
    }
    if (forced) {
      event.preventDefault()
      target.open = true
      return
    }
    setExpandedSections((previous) => ({
      ...previous,
      [key]: target.open,
    }))
  }

  const renderIdeContext = () => {
    if (!ideContextSections.length) {
      return null
    }

    return (
      <section className={styles.ideContext} aria-label="IDE コンテキスト">
        <header className={styles.ideContextHeader}>
          <h3 className={styles.ideContextTitle}>IDE コンテキスト</h3>
          <button
            type="button"
            className={styles.ideContextToggle}
            onClick={() => setContextVisible((prev) => !prev)}
            aria-expanded={contextVisible}
          >
            {contextVisible ? '隠す' : 'IDE コンテキストを表示'}
          </button>
        </header>

        {contextVisible ? (
          <div className={styles.ideContextSections} role="group" aria-label="IDE コンテキスト詳細">
            {ideContextSections.map((section) => {
              const sectionKey = normalizeIdeContextHeading(section.heading)
              const forcedOpen = preferenceMap.get(sectionKey) ?? false
              const isOpen = forcedOpen || expandedSections[sectionKey]
              const checkboxLabel = `${section.heading} を常に表示`

              return (
                <details
                  key={sectionKey || section.heading}
                  className={styles.ideContextSection}
                  open={Boolean(isOpen)}
                  onToggle={handleSectionToggle(sectionKey, forcedOpen)}
                  data-testid={`ide-context-section-${sectionKey || 'unknown'}`}
                >
                  <summary className={styles.ideContextSummary}>
                    <span>{section.heading}</span>
                    <label className={styles.ideContextPreference}>
                      <input
                        type="checkbox"
                        aria-label={checkboxLabel}
                        checked={forcedOpen}
                        onChange={(event) =>
                          ideContextPreference?.setAlwaysVisible(sectionKey, event.currentTarget.checked)
                        }
                        disabled={!ideContextPreference}
                      />
                      <span>{checkboxLabel}</span>
                    </label>
                  </summary>
                  <pre className={styles.ideContextBody}>
                    {section.content?.length ? section.content : 'このセクションには表示できる内容がありません。'}
                  </pre>
                </details>
              )
            })}
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <article className={`${styles.card} ${roleClassName ?? ''} ${highlightedClass}`.trim()} data-highlighted={isHighlighted ? 'true' : 'false'}>
      <header className={styles.header}>
        <span className={styles.role}>{ROLE_LABELS[message.role]}</span>
        <div
          className={styles.metaGroup}
          data-compact={displayMode === 'conversation' ? 'true' : 'false'}
        >
          {message.timestampLabel ? (
            <time dateTime={message.timestampLabel} className={styles.timestamp}>
              {message.timestampLabel}
            </time>
          ) : null}
          {displayMode === 'full' ? (
            <>
              <span className={styles.badge}>{SOURCE_LABELS[message.sourceType]}</span>
              <span className={`${styles.badge} ${styles.channelBadge}`}>{CHANNEL_LABELS[message.channel]}</span>
            </>
          ) : null}
        </div>
      </header>

      <div className={styles.body}>
        {message.isEncryptedReasoning ? (
          <EncryptedReasoningPlaceholder
            checksum={message.encryptedChecksum}
            length={message.encryptedLength}
          />
        ) : message.segments.length === 0 && !hasIdeContext ? (
          <p className={styles.segment}>本文はありません。</p>
        ) : (
          message.segments.map((segment) => (
            <p key={segment.id} className={styles.segment}>
              {segment.text}
            </p>
          ))
        )}
      </div>

      {message.toolCall ? (
        <div className={styles.footer}>
          <ToolCallPanel title={message.toolCall.name ?? 'ツール呼び出し'} data={message.toolCall} />
          <ToolCallPanel title="ツール結果" data={message.toolCall.resultJson ?? message.toolCall.resultText} />
        </div>
      ) : null}

      {renderIdeContext()}
    </article>
  )
}

export default MessageCard

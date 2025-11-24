import { useState } from 'react'

import EncryptedReasoningPlaceholder from './EncryptedReasoningPlaceholder'
import styles from './MessageCard.module.css'
import ToolCallPanel from './ToolCallPanel'

import type { SessionMessageViewModel, TimelineDisplayMode } from './types'

interface MessageCardProps {
  message: SessionMessageViewModel
  isHighlighted?: boolean
  displayMode?: TimelineDisplayMode
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
  displayMode = 'full',
}: MessageCardProps) => {
  const [checkedOptionIds, setCheckedOptionIds] = useState<Set<string>>(new Set())

  const roleClassName = {
    user: styles.roleUser,
    assistant: styles.roleAssistant,
    tool: styles.roleTool,
    system: styles.roleAssistant,
    meta: styles.roleMeta,
  }[message.role]

  const highlightedClass = isHighlighted ? styles.highlighted : ''
  const hasOptions = (message.options?.length ?? 0) > 0
  const hasSegments = message.segments.length > 0

  return (
    <article
      className={`${styles.card} ${roleClassName ?? ''} ${highlightedClass}`.trim()}
      data-highlighted={isHighlighted ? 'true' : 'false'}
    >
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
        ) : !hasSegments && !hasOptions ? (
          <p className={styles.segment}>本文はありません。</p>
        ) : (
          message.segments.map((segment) => (
            <p key={segment.id} className={styles.segment}>
              {segment.text}
            </p>
          ))
        )}
      </div>

      {hasOptions ? (
        <section className={styles.options} aria-label="オプション">
          <h3 className={styles.optionsTitle}>オプション</h3>
          <ul className={styles.optionList}>
            {message.options?.map((option) => (
              <li key={option.id} className={styles.optionItem}>
                <label className={styles.optionLabel}>
                  <input
                    type="checkbox"
                    className={styles.optionCheckbox}
                    checked={checkedOptionIds.has(option.id)}
                    onChange={(event) => {
                      const nextState = event.currentTarget?.checked
                      if (typeof nextState !== 'boolean') return
                      setCheckedOptionIds((prev) => {
                        const next = new Set(prev)
                        if (nextState) {
                          next.add(option.id)
                        } else {
                          next.delete(option.id)
                        }
                        return next
                      })
                    }}
                    aria-label={`${option.label} を有効化`}
                  />
                  <span>{option.label}</span>
                </label>
                {option.value && checkedOptionIds.has(option.id) ? (
                  <p className={styles.optionValue}>{option.value}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {message.toolCall ? (
        <div className={styles.footer}>
          <ToolCallPanel title={message.toolCall.name ?? 'ツール呼び出し'} data={message.toolCall} />
          <ToolCallPanel title="ツール結果" data={message.toolCall.resultJson ?? message.toolCall.resultText} />
        </div>
      ) : null}
    </article>
  )
}

export default MessageCard

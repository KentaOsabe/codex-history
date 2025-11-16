
import EncryptedReasoningPlaceholder from './EncryptedReasoningPlaceholder'
import styles from './MessageCard.module.css'
import ToolCallPanel from './ToolCallPanel'

import type { SessionMessageViewModel } from './types'

interface MessageCardProps {
  message: SessionMessageViewModel
  isHighlighted?: boolean
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

const MessageCard = ({ message, isHighlighted = false }: MessageCardProps) => {
  const roleClassName = {
    user: styles.roleUser,
    assistant: styles.roleAssistant,
    tool: styles.roleTool,
    system: styles.roleAssistant,
    meta: styles.roleMeta,
  }[message.role]
  const highlightedClass = isHighlighted ? styles.highlighted : ''

  return (
    <article className={`${styles.card} ${roleClassName ?? ''} ${highlightedClass}`.trim()} data-highlighted={isHighlighted ? 'true' : 'false'}>
      <header className={styles.header}>
        <span className={styles.role}>{ROLE_LABELS[message.role]}</span>
        <div className={styles.metaGroup}>
          {message.timestampLabel ? (
            <time dateTime={message.timestampLabel} className={styles.timestamp}>
              {message.timestampLabel}
            </time>
          ) : null}
          <span className={styles.badge}>{SOURCE_LABELS[message.sourceType]}</span>
          <span className={`${styles.badge} ${styles.channelBadge}`}>{CHANNEL_LABELS[message.channel]}</span>
        </div>
      </header>

      <div className={styles.body}>
        {message.isEncryptedReasoning ? (
          <EncryptedReasoningPlaceholder
            checksum={message.encryptedChecksum}
            length={message.encryptedLength}
          />
        ) : message.segments.length === 0 ? (
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
    </article>
  )
}

export default MessageCard

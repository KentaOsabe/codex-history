import MessageCard from './MessageCard'
import type { SessionMessageViewModel } from './types'

import styles from './MessageTimeline.module.css'

interface MessageTimelineProps {
  messages: SessionMessageViewModel[]
}

const MessageTimeline = ({ messages }: MessageTimelineProps) => {
  if (messages.length === 0) {
    return <div className={styles.empty}>このセッションには表示できるメッセージがありません。</div>
  }

  return (
    <div className={styles.timeline} aria-live="polite">
      {messages.map((message) => (
        <MessageCard key={message.id} message={message} />
      ))}
    </div>
  )
}

export default MessageTimeline


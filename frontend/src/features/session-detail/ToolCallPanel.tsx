import styles from './ToolCallPanel.module.css'

interface ToolCallPanelProps {
  title: string
  data?: unknown
}

const ToolCallPanel = ({ title, data }: ToolCallPanelProps) => {
  if (!data) return null

  const renderContent = () => {
    if (typeof data === 'string') {
      return data
    }
    return JSON.stringify(data, null, 2)
  }

  return (
    <details className={styles.panel}>
      <summary className={styles.summary}>{title}</summary>
      <div className={styles.content}>
        <pre>{renderContent()}</pre>
      </div>
    </details>
  )
}

export default ToolCallPanel

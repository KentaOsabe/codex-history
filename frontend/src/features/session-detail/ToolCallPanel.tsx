import { useEffect, useMemo, useState } from 'react'

import styles from './ToolCallPanel.module.css'

interface ToolCallPanelProps {
  title: string
  data?: unknown
}

type IdleDeadlineLike = Pick<IdleDeadline, 'didTimeout' | 'timeRemaining'>

const getScheduler = () => {
  const root: typeof globalThis = typeof window !== 'undefined' ? window : globalThis
  const request = (root as Window & { requestIdleCallback?: typeof window.requestIdleCallback }).requestIdleCallback
  const cancel = (root as Window & { cancelIdleCallback?: typeof window.cancelIdleCallback }).cancelIdleCallback

  if (typeof request === 'function' && typeof cancel === 'function') {
    return {
      schedule: (cb: IdleRequestCallback) => request.call(root, cb),
      cancel: (id: number) => cancel.call(root, id),
    }
  }

  return {
    schedule: (cb: IdleRequestCallback) =>
      (root.setTimeout as typeof setTimeout)(
        () =>
          cb({
            didTimeout: false,
            timeRemaining: () => 16,
          } as IdleDeadlineLike),
        1,
      ),
    cancel: (id: number) => (root.clearTimeout as typeof clearTimeout)(id),
  }
}

const scheduler = getScheduler()

const ToolCallPanel = ({ title, data }: ToolCallPanelProps) => {
  if (!data) return null

  const isPrimitiveString = typeof data === 'string'
  const [serialized, setSerialized] = useState<string | null>(() => (isPrimitiveString ? data : null))

  useEffect(() => {
    if (!data) {
      setSerialized(null)
      return
    }
    if (typeof data === 'string') {
      setSerialized(data)
      return
    }

    let cancelled = false
    const handle = scheduler.schedule(() => {
      if (cancelled) return
      try {
        setSerialized(JSON.stringify(data, null, 2))
      } catch (error) {
        setSerialized(`JSON parse error: ${String(error)}`)
      }
    })

    return () => {
      cancelled = true
      scheduler.cancel(handle)
    }
  }, [data])

  const content = useMemo(() => {
    if (serialized) {
      return <pre>{serialized}</pre>
    }
    return <span className={styles.placeholder}>整形中...</span>
  }, [serialized])

  return (
    <details className={styles.panel}>
      <summary className={styles.summary}>{title}</summary>
      <div className={styles.content}>{content}</div>
    </details>
  )
}

export default ToolCallPanel

import styles from './ToolBundlePanel.module.css'
import ToolInvocationTimeline from './ToolInvocationTimeline'

import type { SanitizedViewerMode, ToolInvocationGroup } from './types'

interface ToolBundlePanelProps {
  toolInvocations: ToolInvocationGroup[]
  sessionId?: string
  viewerMode?: SanitizedViewerMode
}

const ToolBundlePanel = ({ toolInvocations, sessionId, viewerMode = 'default' }: ToolBundlePanelProps) => {
  return (
    <section className={styles.panel} aria-label="ツールイベント詳細">
      <ToolInvocationTimeline toolInvocations={toolInvocations} sessionId={sessionId} viewerMode={viewerMode} />
    </section>
  )
}

export default ToolBundlePanel

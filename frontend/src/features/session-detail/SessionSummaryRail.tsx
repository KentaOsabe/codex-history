import type { SessionVariant } from '@/api/types/sessions'
import type { ResponsiveLayoutState } from '@/features/layout/useResponsiveLayout'

import SessionDetailHeader from './SessionDetailHeader'
import styles from './SessionSummaryRail.module.css'
import TimelineFilterBar, { type TimelineFilterControls } from './TimelineFilterBar'

import type { SessionDetailViewModel } from './types'

interface SessionSummaryRailProps {
  detail?: SessionDetailViewModel
  variant: SessionVariant
  hasSanitizedVariant: boolean
  onVariantChange: (variant: SessionVariant) => void
  layout: ResponsiveLayoutState
  resolvedSessionId: string
  timelineFilterControls?: TimelineFilterControls
}

const SessionSummaryRail = ({
  detail,
  variant,
  hasSanitizedVariant,
  onVariantChange,
  layout,
  resolvedSessionId,
  timelineFilterControls,
}: SessionSummaryRailProps) => {
  const isAccordionLayout = layout.columns === 1

  const renderHero = () => (
    <div className={styles.hero}>
      <span className={styles.heroBadge}>Session Detail</span>
      <p className={styles.heroMeta}>
        現在のセッション: <code>{resolvedSessionId}</code>
      </p>
    </div>
  )

  const renderInfoBar = () => {
    if (!detail) {
      return null
    }

    return (
      <section className={`${styles.infoBar} layout-full-width`} aria-label="メタ情報">
        <span>
          データソース: <code>{detail.meta.relativePath}</code>
        </span>
        {detail.meta.lastUpdatedLabel ? <span>最終更新: {detail.meta.lastUpdatedLabel}</span> : null}
      </section>
    )
  }

  const renderSummaryBody = () => {
    if (!detail) {
      return (
        <div className={styles.skeleton} role="status" aria-live="polite">
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      )
    }

    return (
      <div className={`${styles.railCard} ${styles.railContent}`}>
        <SessionDetailHeader
          detail={detail}
          variant={variant}
          hasSanitizedVariant={hasSanitizedVariant}
          onVariantChange={onVariantChange}
        />
        {renderInfoBar()}
        {!isAccordionLayout && timelineFilterControls ? (
          <TimelineFilterBar placement="rail" {...timelineFilterControls} />
        ) : null}
      </div>
    )
  }

  if (isAccordionLayout) {
    return (
      <section className={`${styles.rail} ${styles.railMobile}`} data-testid="session-summary-rail">
        <details className={styles.accordion} data-testid="session-summary-accordion">
          <summary className={styles.accordionSummary}>
            <span className={styles.accordionTitle}>セッション概要</span>
            <span className={styles.summaryMeta}>
              Session ID: <code>{resolvedSessionId}</code>
            </span>
          </summary>
          <div className={styles.accordionBody}>
            <div className={styles.accordionBodyInner}>
              {renderHero()}
              {renderSummaryBody()}
            </div>
          </div>
        </details>
      </section>
    )
  }

  return (
    <aside className={styles.rail} aria-label="セッション概要" data-testid="session-summary-rail">
      {renderHero()}
      {renderSummaryBody()}
    </aside>
  )
}

export default SessionSummaryRail

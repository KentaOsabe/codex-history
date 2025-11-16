import TimelineFilterBarStyles from './TimelineFilterBar.module.css'

import type { TimelineBundleSummary, TimelineDisplayMode } from './types'

export interface TimelineFilterControls {
  mode: TimelineDisplayMode
  hiddenCount: number
  bundleSummaries: TimelineBundleSummary[]
  onModeChange: (mode: TimelineDisplayMode) => void
  onBundleSelect?: (summary: TimelineBundleSummary) => void
}

interface TimelineFilterBarProps extends TimelineFilterControls {
  placement: 'timeline' | 'rail'
  className?: string
}

const MODE_LABELS: Record<TimelineDisplayMode, string> = {
  conversation: '会話のみ',
  full: 'すべて表示',
}

const TimelineFilterBar = ({
  mode,
  hiddenCount,
  bundleSummaries,
  onModeChange,
  onBundleSelect,
  placement,
  className,
}: TimelineFilterBarProps) => {
  const handleModeToggle = (nextMode: TimelineDisplayMode) => {
    if (mode === nextMode) {
      return
    }
    onModeChange(nextMode)
  }

  const handleBundleClick = (summary: TimelineBundleSummary) => {
    onBundleSelect?.(summary)
  }

  const containerClassName = [
    TimelineFilterBarStyles.filterBar,
    placement === 'timeline' ? TimelineFilterBarStyles.timelinePlacement : TimelineFilterBarStyles.railPlacement,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className={containerClassName}
      aria-label="タイムライン表示モード"
      data-testid="timeline-filter-bar"
      data-placement={placement}
    >
      <div className={TimelineFilterBarStyles.modeSwitch} role="group" aria-label="表示モード切替">
        {(Object.entries(MODE_LABELS) as [TimelineDisplayMode, string][]).map(([ key, label ]) => (
          <button
            key={key}
            type="button"
            className={TimelineFilterBarStyles.modeButton}
            data-active={mode === key}
            aria-pressed={mode === key}
            onClick={() => handleModeToggle(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className={TimelineFilterBarStyles.hiddenCount} aria-live="polite">
        非表示 {hiddenCount} 件
      </p>

      {bundleSummaries.length ? (
        <div className={TimelineFilterBarStyles.bundleList} aria-label="隠れているイベント">
          {bundleSummaries.map((summary) => (
            <button
              key={summary.id}
              type="button"
              className={TimelineFilterBarStyles.bundleButton}
              data-sanitized={summary.isSanitizedVariant}
              onClick={() => handleBundleClick(summary)}
              title={summary.preview ?? `${summary.label}の詳細を開く`}
              aria-label={`${summary.label} ${summary.count}件 ${summary.preview ?? '詳細を表示'}`}
            >
              <span className={TimelineFilterBarStyles.bundleLabel}>{summary.label}</span>
              <span className={TimelineFilterBarStyles.bundleCount}>{summary.count}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default TimelineFilterBar

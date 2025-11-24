import TimelineFilterBarStyles from './TimelineFilterBar.module.css'

import type { IdeContextPreferenceState, TimelineBundleSummary, TimelineDisplayMode } from './types'

export interface TimelineFilterControls {
  mode: TimelineDisplayMode
  hiddenCount: number
  bundleSummaries: TimelineBundleSummary[]
  onModeChange: (mode: TimelineDisplayMode) => void
  onBundleSelect?: (summary: TimelineBundleSummary) => void
  ideContextPreference?: IdeContextPreferenceState
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
  ideContextPreference,
}: TimelineFilterBarProps) => {
  const isCollapsed = mode === 'conversation'

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
      data-collapsed={isCollapsed ? 'true' : 'false'}
    >
      {isCollapsed ? (
        <div className={TimelineFilterBarStyles.collapsed}>
          <p className={TimelineFilterBarStyles.collapsedLabel}>会話のみを表示中</p>
          <button
            type="button"
            className={TimelineFilterBarStyles.expandButton}
            onClick={() => handleModeToggle('full')}
          >
            詳細表示に切り替え
          </button>
        </div>
      ) : (
        <>
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

          {ideContextPreference?.sections.length ? (
            <details className={TimelineFilterBarStyles.contextPreferences} data-testid="ide-context-preferences">
              <summary className={TimelineFilterBarStyles.contextPreferencesSummary}>IDE コンテキスト表示設定</summary>
              <div className={TimelineFilterBarStyles.contextPreferencesList} role="group" aria-label="IDE コンテキスト表示設定">
                {ideContextPreference.sections.map((section) => (
                  <label key={section.key} className={TimelineFilterBarStyles.contextPreferencesItem}>
                    <input
                      type="checkbox"
                      checked={section.alwaysVisible}
                      onChange={(event) => {
                        const nextState = event.currentTarget?.checked
                        if (typeof nextState !== 'boolean') return
                        ideContextPreference.setAlwaysVisible(section.key, nextState)
                      }}
                    />
                    <span>{section.heading}</span>
                  </label>
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}
    </section>
  )
}

export default TimelineFilterBar

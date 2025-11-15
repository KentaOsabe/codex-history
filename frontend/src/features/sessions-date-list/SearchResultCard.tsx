import styles from './SearchResultCard.module.css'

export interface SearchResultCardViewModel {
  id: string
  sessionId: string
  highlightHtml: string
  occurredAtLabel: string
  roleLabel: string
  relativePath?: string
  hitCount: number
  isPrimaryHit: boolean
  sessionLink?: string
}

export interface SearchResultCardProps {
  result: SearchResultCardViewModel
  onSelect: (sessionId: string, options?: { targetPath?: string }) => void
}

const resolveTargetPath = ({ sessionLink, sessionId }: SearchResultCardViewModel) => {
  if (!sessionLink) return undefined

  if (sessionLink.includes('/api/sessions/')) {
    return `/sessions/${encodeURIComponent(sessionId)}`
  }

  return sessionLink
}

const SearchResultCard = ({ result, onSelect }: SearchResultCardProps) => {
  const actionLabel = `${result.sessionId} を開く`
  const targetPath = resolveTargetPath(result)

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() =>
        onSelect(result.sessionId, targetPath ? { targetPath } : undefined)
      }
      aria-label={actionLabel}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.sessionId}>{result.sessionId}</p>
          {result.relativePath ? <p className={styles.path}>{result.relativePath}</p> : null}
        </div>
        {result.isPrimaryHit && result.hitCount > 1 ? (
          <span className={styles.badge}>{result.hitCount}件ヒット</span>
        ) : null}
      </header>
      <div className={styles.metadata}>
        <span className={styles.meta}>{result.roleLabel}</span>
        <span className={styles.meta}>{result.occurredAtLabel}</span>
      </div>
      <p
        className={styles.highlight}
        dangerouslySetInnerHTML={{ __html: result.highlightHtml }}
      />
    </button>
  )
}

export default SearchResultCard

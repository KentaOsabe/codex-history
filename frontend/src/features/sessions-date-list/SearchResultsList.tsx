import { Fragment, useMemo } from 'react'

import type { SearchResponse } from '@/api/types/search'
import { safeHtml } from '@/features/session-detail/safeHtml'

import { formatDateTime } from './dateUtils'
import EmptyStateView from './EmptyStateView'
import PaginationControls from './PaginationControls'
import SearchResultCard, { type SearchResultCardViewModel } from './SearchResultCard'
import styles from './SearchResultsList.module.css'
import StatusBanner from './StatusBanner'

import type { FetchErrorView } from './errorView'

const roleLabels: Record<string, string> = {
  user: 'ユーザー',
  assistant: 'アシスタント',
  tool: 'ツール',
  system: 'システム',
}

const buildViewModels = (response?: SearchResponse): SearchResultCardViewModel[] => {
  if (!response) return []

  const hitCounts = new Map<string, number>()
  response.data.forEach((result) => {
    const key = result.attributes.session_id
    hitCounts.set(key, (hitCounts.get(key) ?? 0) + 1)
  })

  const seenSession = new Set<string>()

  return response.data.map((result) => {
    const sessionId = result.attributes.session_id
    const { html } = safeHtml(result.attributes.highlight ?? '')
    const role = roleLabels[result.attributes.message_role] ?? result.attributes.message_role
    const occurredAtLabel = formatDateTime(result.attributes.occurred_at)
    const hitCount = hitCounts.get(sessionId) ?? 1
    const isPrimaryHit = !seenSession.has(sessionId)
    if (!seenSession.has(sessionId)) {
      seenSession.add(sessionId)
    }

    return {
      id: result.id,
      sessionId,
      highlightHtml: html,
      occurredAtLabel,
      roleLabel: role,
      relativePath: result.attributes.relative_path,
      hitCount,
      isPrimaryHit,
      sessionLink: result.links?.session,
    }
  })
}

export interface SearchResultsListProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  response?: SearchResponse
  error?: FetchErrorView
  keyword?: string
  fetchedAt?: number
  page: number
  onPageChange: (page: number) => void
  isPagingDisabled?: boolean
  onRetry: () => void
  onResultSelect: (sessionId: string, options?: { targetPath?: string }) => void
}

const SearchResultsList = ({
  status,
  response,
  error,
  keyword,
  fetchedAt,
  page,
  onPageChange,
  isPagingDisabled = false,
  onRetry,
  onResultSelect,
}: SearchResultsListProps) => {
  const results = useMemo(() => buildViewModels(response), [response])
  const totalCount = response?.meta.pagination.total_count ?? 0
  const totalPages = response?.meta.pagination.total_pages ?? 0
  const showPagination = totalPages > 1
  const isLoading = status === 'loading'

  const renderSkeletons = () => (
    <div className={styles.grid}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`search-skeleton-${index}`} className={styles.skeleton}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLineShort} />
          <div className={styles.skeletonHighlight} />
        </div>
      ))}
    </div>
  )

  if (!keyword && status === 'idle' && !response) {
    return null
  }

  return (
    <section className={styles.section} aria-labelledby="sessions-search-results">
      <header className={styles.header}>
        <div>
          <h2 id="sessions-search-results">検索結果</h2>
          {keyword ? (
            <p className={styles.subTitle} aria-live="polite">
              キーワード: <strong>{keyword}</strong>
            </p>
          ) : null}
        </div>
        {fetchedAt ? <p className={styles.timestamp}>最終更新: {formatDateTime(new Date(fetchedAt))}</p> : null}
      </header>

      {error ? (
        <StatusBanner error={error} onRetry={onRetry} isRetrying={isLoading} retryLabel="もう一度試す" />
      ) : null}

      {isLoading && !results.length ? renderSkeletons() : null}

      {!isLoading && results.length === 0 && !error ? (
        <EmptyStateView
          title="該当する会話が見つかりません"
          hint="フィルタ条件を見直すか、別のキーワードを試してください。"
        />
      ) : null}

      {!isLoading && results.length > 0 ? (
        <Fragment>
          <p className={styles.meta} aria-live="polite">
            検索ヒット {totalCount} 件
          </p>
          <div className={styles.grid}>
            {results.map((result) => (
              <SearchResultCard key={result.id} result={result} onSelect={onResultSelect} />
            ))}
          </div>
        </Fragment>
      ) : null}

      {showPagination ? (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          label="検索結果"
          isLoading={isPagingDisabled || isLoading}
          className={styles.pagination}
        />
      ) : null}
    </section>
  )
}

export default SearchResultsList

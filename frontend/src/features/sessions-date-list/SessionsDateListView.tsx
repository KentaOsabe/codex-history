import { useCallback, useEffect, useMemo, useState } from 'react'

import ResponsiveGrid from '@/features/layout/ResponsiveGrid'
import { useSessionNavigation } from './navigation'
import PaginationControls from './PaginationControls'
import SearchAndFilterPanel from './SearchAndFilterPanel'
import SearchResultsList from './SearchResultsList'
import SessionList from './SessionList'
import { deriveLastUpdatedLabel, mapSessionsToListItems } from './sessionListMappers'
import styles from './SessionsDateListView.module.css'
import StatusBanner from './StatusBanner'
import { useSearchResults } from './useSearchResults'
import { useSessionsByDateRange } from './useSessionsByDateRange'
import { useSessionsFilters } from './useSessionsFilters'

const SessionsDateListView = () => {
  const filters = useSessionsFilters()
  const { navigateToSessionDetail } = useSessionNavigation()
  const [ activeKeyword, setActiveKeyword ] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!filters.keyword.trim()) {
      setActiveKeyword(undefined)
    }
  }, [filters.keyword])

  const searchResponse = useSearchResults({
    keyword: activeKeyword,
    page: filters.searchPagination.page,
    limit: filters.searchPagination.limit,
  })

  const sessionsResponse = useSessionsByDateRange({
    startDate: filters.dateRange.startDate,
    endDate: filters.dateRange.endDate,
    page: filters.listPagination.page,
    perPage: filters.listPagination.perPage,
    enabled: !filters.dateRangeError,
  })

  const sessionItems = useMemo(() => mapSessionsToListItems(sessionsResponse.data), [sessionsResponse.data])
  const lastUpdatedLabel = useMemo(() => deriveLastUpdatedLabel(sessionsResponse.data), [sessionsResponse.data])

  const handleSearchSubmit = useCallback(() => {
    if (!filters.normalizedKeyword) {
      filters.validateKeyword()
      return
    }
    setActiveKeyword(filters.normalizedKeyword)
  }, [filters])

  const handleClearFilters = useCallback(() => {
    filters.clearAll()
    setActiveKeyword(undefined)
  }, [filters])

  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      navigateToSessionDetail(sessionId)
    },
    [navigateToSessionDetail],
  )

  const handleResultSelect = useCallback(
    (sessionId: string, options?: { targetPath?: string }) => {
      navigateToSessionDetail(sessionId, options)
    },
    [navigateToSessionDetail],
  )

  const sessionVariant: 'loading' | 'ready' | 'empty' = sessionsResponse.status === 'loading' && sessionItems.length === 0
    ? 'loading'
    : sessionItems.length === 0
      ? 'empty'
      : 'ready'

  const sessionTotalPages = sessionsResponse.data?.meta.total_pages ?? 0
  const sessionContextLabel = filters.dateRange.startDate === filters.dateRange.endDate
    ? undefined
    : `${filters.dateRange.startDate}〜${filters.dateRange.endDate}`

  return (
    <div className={styles.page}>
      <ResponsiveGrid
        className={styles.layout}
        data-testid="sessions-responsive-grid"
        minSidebarWidth="320px"
        gap="var(--space-xl)"
      >
        <div className={styles.sidebarColumn}>
          <SearchAndFilterPanel
            keyword={filters.keyword}
            keywordError={filters.keywordError}
            onKeywordChange={filters.setKeyword}
            onSubmit={handleSearchSubmit}
            isSearchDisabled={searchResponse.status === 'loading'}
            dateRange={filters.dateRange}
            dateRangeError={filters.dateRangeError}
            onDateRangeChange={filters.setDateRange}
            onClearFilters={handleClearFilters}
            className="layout-panel layout-panel--padded"
          />
        </div>

        <div className={styles.contentColumn}>
          <SearchResultsList
            status={searchResponse.status}
            response={searchResponse.data}
            error={searchResponse.error}
            keyword={activeKeyword}
            fetchedAt={searchResponse.fetchedAt}
            page={filters.searchPagination.page}
            onPageChange={filters.setSearchPage}
            isPagingDisabled={searchResponse.status === 'loading'}
            onRetry={() => {
              void searchResponse.refetch({ force: true })
            }}
            onResultSelect={handleResultSelect}
            className="layout-panel layout-panel--padded"
          />

          <section className={`${styles.section} layout-panel layout-panel--padded`} aria-labelledby="sessions-list-heading">
            <header className={styles.listHeader}>
              <div>
                <h2 id="sessions-list-heading">セッション一覧</h2>
                {lastUpdatedLabel ? <p className={styles.metaInfo}>最終更新: {lastUpdatedLabel}</p> : null}
              </div>
              {sessionContextLabel ? <p className={styles.metaInfo}>期間: {sessionContextLabel}</p> : null}
            </header>

            <StatusBanner
              error={sessionsResponse.error}
              onRetry={() => {
                void sessionsResponse.refetch({ force: true })
              }}
              isRetrying={sessionsResponse.status === 'loading'}
              className="layout-pill layout-full-width"
            />

            <SessionList
              variant={sessionVariant}
              items={sessionItems}
              onSelect={handleSessionSelect}
              contextLabel={sessionContextLabel}
            />

            {sessionTotalPages > 1 ? (
              <PaginationControls
                page={filters.listPagination.page}
                totalPages={sessionTotalPages}
                onPageChange={filters.setListPage}
                label="セッション一覧"
                isLoading={sessionsResponse.status === 'loading'}
                className={`${styles.pagination} layout-pill`}
              />
            ) : null}
          </section>
        </div>
      </ResponsiveGrid>
    </div>
  )
}

export default SessionsDateListView

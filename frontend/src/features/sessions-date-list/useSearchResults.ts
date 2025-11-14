import { useCallback, useEffect, useRef, useState } from 'react'

import { searchApi } from '@/api/search'
import type { SearchParams, SearchResponse, SearchScope } from '@/api/types/search'

import { mapApiErrorToFetchError, type FetchErrorView } from './errorView'
import { logError } from './logError'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseSearchResultsParams {
  keyword?: string
  page?: number
  limit?: number
  scope?: SearchScope
  enabled?: boolean
}

interface CacheEntry {
  response: SearchResponse
  fetchedAt: number
}

export interface UseSearchResultsResult {
  status: FetchStatus
  data?: SearchResponse
  error?: FetchErrorView
  fetchedAt?: number
  refetch: (options?: { force?: boolean }) => Promise<SearchResponse | undefined>
}

const MIN_KEYWORD_LENGTH = 2
const DEFAULT_LIMIT = 25
const MIN_LIMIT = 1
const MAX_LIMIT = 50
const DEFAULT_PAGE = 1
const DEFAULT_SCOPE: SearchScope = 'chat_messages'
const MAX_CACHE_SIZE = 10

const clampPage = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_PAGE
  const floored = Math.floor(value)
  return floored > 0 ? floored : DEFAULT_PAGE
}

const clampLimit = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_LIMIT
  const floored = Math.floor(value)
  if (floored < MIN_LIMIT) return MIN_LIMIT
  if (floored > MAX_LIMIT) return MAX_LIMIT
  return floored
}

const normalizeKeyword = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length >= MIN_KEYWORD_LENGTH ? trimmed : undefined
}

const buildCacheKey = (params: Required<SearchParams>): string => {
  return [params.keyword, params.page ?? DEFAULT_PAGE, params.limit ?? DEFAULT_LIMIT, params.scope ?? DEFAULT_SCOPE].join('|')
}

export const useSearchResults = (params: UseSearchResultsParams): UseSearchResultsResult => {
  const normalizedKeyword = normalizeKeyword(params.keyword)
  const normalizedPage = clampPage(params.page)
  const normalizedLimit = clampLimit(params.limit)
  const scope = params.scope ?? DEFAULT_SCOPE
  const enabled = params.enabled ?? true
  const shouldFetch = Boolean(enabled && normalizedKeyword)
  const cacheKey = shouldFetch
    ? buildCacheKey({ keyword: normalizedKeyword!, page: normalizedPage, limit: normalizedLimit, scope })
    : undefined

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map())
  const pendingRef = useRef<{ key: string; controller: AbortController } | null>(null)
  const lastSuccessRef = useRef<{ response?: SearchResponse; fetchedAt?: number }>({ response: undefined, fetchedAt: undefined })

  const touchCacheEntry = useCallback(
    (key: string): CacheEntry | undefined => {
      const cache = cacheRef.current
      const entry = cache.get(key)
      if (!entry) return undefined
      cache.delete(key)
      cache.set(key, entry)
      return entry
    },
    [],
  )

  const writeCacheEntry = useCallback((key: string, response: SearchResponse) => {
    const cache = cacheRef.current
    const nextEntry: CacheEntry = { response, fetchedAt: Date.now() }
    cache.set(key, nextEntry)
    while (cache.size > MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value
      if (!oldestKey) break
      cache.delete(oldestKey)
    }
    return nextEntry
  }, [])

  const [state, setState] = useState<{ status: FetchStatus; data?: SearchResponse; error?: FetchErrorView; fetchedAt?: number }>(() => {
    if (cacheKey) {
      const cached = touchCacheEntry(cacheKey)
      if (cached) {
        lastSuccessRef.current = { response: cached.response, fetchedAt: cached.fetchedAt }
        return { status: 'success', data: cached.response, error: undefined, fetchedAt: cached.fetchedAt }
      }
    }
    return { status: shouldFetch ? 'idle' : 'idle', data: undefined, error: undefined, fetchedAt: undefined }
  })

  const cancelPending = useCallback(() => {
    if (pendingRef.current) {
      pendingRef.current.controller.abort()
      pendingRef.current = null
    }
  }, [])

  const performFetch = useCallback(
    async (options?: { force?: boolean }) => {
      if (!cacheKey || !shouldFetch || !normalizedKeyword) {
        return undefined
      }

      if (!options?.force) {
        const cached = touchCacheEntry(cacheKey)
        if (cached) {
          lastSuccessRef.current = { response: cached.response, fetchedAt: cached.fetchedAt }
          setState({ status: 'success', data: cached.response, error: undefined, fetchedAt: cached.fetchedAt })
          return cached.response
        }
      }

      const controller = new AbortController()
      if (pendingRef.current) {
        pendingRef.current.controller.abort()
      }
      pendingRef.current = { key: cacheKey, controller }

      setState((prev) => ({ status: 'loading', data: prev.data, error: undefined, fetchedAt: prev.fetchedAt }))

      try {
        const response = await searchApi.search({ keyword: normalizedKeyword, page: normalizedPage, limit: normalizedLimit, scope })
        if (controller.signal.aborted) {
          return undefined
        }
        const entry = writeCacheEntry(cacheKey, response)
        lastSuccessRef.current = { response, fetchedAt: entry.fetchedAt }
        setState({ status: 'success', data: response, error: undefined, fetchedAt: entry.fetchedAt })
        return response
      } catch (error) {
        if (controller.signal.aborted) {
          return undefined
        }
        logError(error, 'sessions-search:fetch')
        const viewError = mapApiErrorToFetchError(error)
        setState({
          status: 'error',
          data: lastSuccessRef.current.response,
          error: viewError,
          fetchedAt: lastSuccessRef.current.fetchedAt,
        })
        throw error
      } finally {
        if (pendingRef.current?.controller === controller) {
          pendingRef.current = null
        }
      }
    },
    [cacheKey, normalizedKeyword, normalizedLimit, normalizedPage, scope, shouldFetch, touchCacheEntry, writeCacheEntry],
  )

  useEffect(() => {
    if (!cacheKey || !shouldFetch) {
      cancelPending()
      setState((prev) => ({ status: 'idle', data: prev.data, error: undefined, fetchedAt: prev.fetchedAt }))
      return
    }

    const cached = touchCacheEntry(cacheKey)
    if (cached) {
      lastSuccessRef.current = { response: cached.response, fetchedAt: cached.fetchedAt }
      setState({ status: 'success', data: cached.response, error: undefined, fetchedAt: cached.fetchedAt })
      return
    }

    performFetch().catch(() => {
      // エラー処理は performFetch 側で実施済み
    })

    return () => {
      cancelPending()
    }
  }, [cacheKey, shouldFetch, performFetch, touchCacheEntry, cancelPending])

  const refetch = useCallback(
    async (options?: { force?: boolean }) => {
      return performFetch({ force: options?.force ?? false })
    },
    [performFetch],
  )

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    fetchedAt: state.fetchedAt,
    refetch,
  }
}

export default useSearchResults

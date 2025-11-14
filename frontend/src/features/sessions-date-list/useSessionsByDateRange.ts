import { useCallback, useEffect, useRef, useState } from 'react'

import { sessionsApi } from '@/api/sessions'
import type { SessionsIndexResponse } from '@/api/types/sessions'

import { mapApiErrorToFetchError, type FetchErrorView } from './errorView'
import { logError } from './logError'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseSessionsByDateRangeParams {
  startDate?: string
  endDate?: string
  page?: number
  perPage?: number
  enabled?: boolean
}

export interface UseSessionsByDateRangeResult {
  status: FetchStatus
  data?: SessionsIndexResponse
  error?: FetchErrorView
  refetch: (options?: { force?: boolean }) => Promise<SessionsIndexResponse | undefined>
}

const DEFAULT_PER_PAGE = 25
const MIN_PER_PAGE = 1
const MAX_PER_PAGE = 100
const DEFAULT_PAGE = 1

const clampPage = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_PAGE
  const floored = Math.floor(value)
  return floored > 0 ? floored : DEFAULT_PAGE
}

const clampPerPage = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_PER_PAGE
  const floored = Math.floor(value)
  if (floored < MIN_PER_PAGE) return MIN_PER_PAGE
  if (floored > MAX_PER_PAGE) return MAX_PER_PAGE
  return floored
}

const buildCacheKey = (startDate: string, endDate: string, page: number, perPage: number): string => {
  return [startDate, endDate, page, perPage].join('|')
}

export const useSessionsByDateRange = (params: UseSessionsByDateRangeParams): UseSessionsByDateRangeResult => {
  const startDate = params.startDate?.trim()
  const endDate = params.endDate?.trim()
  const page = clampPage(params.page)
  const perPage = clampPerPage(params.perPage)
  const enabled = params.enabled ?? true
  const shouldFetch = Boolean(startDate && endDate && enabled)
  const cacheKey = shouldFetch && startDate && endDate ? buildCacheKey(startDate, endDate, page, perPage) : undefined

  const cacheRef = useRef<Map<string, SessionsIndexResponse>>(new Map())
  const inFlightRef = useRef<Map<string, Promise<SessionsIndexResponse>>>(new Map())
  const lastSuccessRef = useRef<SessionsIndexResponse | undefined>(undefined)

  const [state, setState] = useState<{ status: FetchStatus; data?: SessionsIndexResponse; error?: FetchErrorView }>(() => {
    if (cacheKey) {
      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        lastSuccessRef.current = cached
        return { status: 'success', data: cached, error: undefined }
      }
    }
    return { status: 'idle', data: undefined, error: undefined }
  })

  const executeFetch = useCallback(
    async (key: string, force = false): Promise<SessionsIndexResponse> => {
      if (!force) {
        const cached = cacheRef.current.get(key)
        if (cached) {
          return cached
        }
      }

      const existing = inFlightRef.current.get(key)
      if (existing) {
        return existing
      }

      const requestPromise = sessionsApi.list({ startDate: startDate!, endDate: endDate!, page, perPage })
      inFlightRef.current.set(key, requestPromise)

      try {
        const response = await requestPromise
        cacheRef.current.set(key, response)
        return response
      } finally {
        inFlightRef.current.delete(key)
      }
    },
    [startDate, endDate, page, perPage],
  )

  useEffect(() => {
    if (!cacheKey || !shouldFetch) {
      setState((prev) => ({ status: 'idle', data: prev.data, error: undefined }))
      return
    }

    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      lastSuccessRef.current = cached
      setState({ status: 'success', data: cached, error: undefined })
      return
    }

    let isActive = true

    setState((prev) => ({ status: 'loading', data: prev.data, error: undefined }))

    executeFetch(cacheKey)
      .then((response) => {
        if (!isActive) return
        lastSuccessRef.current = response
        setState({ status: 'success', data: response, error: undefined })
      })
      .catch((error) => {
        if (!isActive) return
        logError(error, 'sessions-date-range:fetch')
        const viewError = mapApiErrorToFetchError(error)
        setState((prev) => ({ status: 'error', data: prev.data ?? lastSuccessRef.current, error: viewError }))
      })

    return () => {
      isActive = false
    }
  }, [cacheKey, shouldFetch, executeFetch])

  const refetch = useCallback(
    async (options?: { force?: boolean }) => {
      if (!cacheKey || !shouldFetch) {
        return undefined
      }

      setState((prev) => ({ status: 'loading', data: prev.data, error: undefined }))

      try {
        const response = await executeFetch(cacheKey, options?.force ?? false)
        lastSuccessRef.current = response
        setState({ status: 'success', data: response, error: undefined })
        return response
      } catch (error) {
        logError(error, 'sessions-date-range:fetch')
        const viewError = mapApiErrorToFetchError(error)
        setState((prev) => ({ status: 'error', data: prev.data ?? lastSuccessRef.current, error: viewError }))
        throw error
      }
    },
    [cacheKey, shouldFetch, executeFetch],
  )

  return {
    status: state.status,
    data: state.data ?? lastSuccessRef.current,
    error: state.error,
    refetch,
  }
}

export default useSessionsByDateRange

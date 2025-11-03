import { useCallback, useEffect, useRef, useState } from 'react'

import { sessionsApi } from '@/api/sessions'
import type { SessionsIndexResponse } from '@/api/types/sessions'

import { mapApiErrorToFetchError, type FetchErrorView } from './errorView'
import { logError } from './logError'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseSessionsByDateParams {
  dateIso: string
}

interface UseSessionsByDateResult {
  status: FetchStatus
  data?: SessionsIndexResponse
  error?: FetchErrorView
  refetch: (options?: { force?: boolean }) => Promise<SessionsIndexResponse | undefined>
}

export const useSessionsByDate = ({ dateIso }: UseSessionsByDateParams): UseSessionsByDateResult => {
  const cacheRef = useRef<Map<string, SessionsIndexResponse>>(new Map())
  const inFlightRef = useRef<Map<string, Promise<SessionsIndexResponse>>>(new Map())

  const [state, setState] = useState<{
    status: FetchStatus
    data?: SessionsIndexResponse
    error?: FetchErrorView
  }>(() => {
    const cached = cacheRef.current.get(dateIso)
    if (cached) {
      return { status: 'success', data: cached }
    }
    return { status: 'idle', data: undefined, error: undefined }
  })

  const executeFetch = useCallback(
    async (targetDateIso: string, force = false): Promise<SessionsIndexResponse> => {
      const cached = cacheRef.current.get(targetDateIso)
      if (cached && !force) {
        return cached
      }

      const existingPromise = inFlightRef.current.get(targetDateIso)
      let requestPromise: Promise<SessionsIndexResponse>

      if (existingPromise) {
        requestPromise = existingPromise
      } else {
        const newPromise = sessionsApi.list({ startDate: targetDateIso, endDate: targetDateIso })
        inFlightRef.current.set(targetDateIso, newPromise)
        requestPromise = newPromise
      }

      try {
        const response = await requestPromise
        cacheRef.current.set(targetDateIso, response)
        return response
      } finally {
        if (!existingPromise) {
          inFlightRef.current.delete(targetDateIso)
        }
      }
    },
    [],
  )

  useEffect(() => {
    let isActive = true

    const cached = cacheRef.current.get(dateIso)
    if (cached) {
      setState({ status: 'success', data: cached, error: undefined })
      return
    }

    setState((prev) => ({ status: 'loading', data: prev.data, error: undefined }))

    executeFetch(dateIso)
      .then((response) => {
        if (!isActive) return
        setState({ status: 'success', data: response, error: undefined })
      })
      .catch((error) => {
        if (!isActive) return
        logError(error, 'sessions-date-list:fetch')
        const viewError = mapApiErrorToFetchError(error)
        setState((prev) => ({ status: 'error', data: prev.data, error: viewError }))
      })

    return () => {
      isActive = false
    }
  }, [ dateIso, executeFetch ])

  const refetch = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false

      setState((prev) => ({ status: 'loading', data: prev.data, error: undefined }))

      try {
        const response = await executeFetch(dateIso, force)
        setState({ status: 'success', data: response, error: undefined })
        return response
      } catch (error) {
        logError(error, 'sessions-date-list:refetch')
        const viewError = mapApiErrorToFetchError(error)
        setState((prev) => ({ status: 'error', data: prev.data, error: viewError }))
        throw error
      }
    },
    [ dateIso, executeFetch ],
  )

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    refetch,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'

import { sessionsApi } from '@/api/sessions'
import type { SessionVariant } from '@/api/types/sessions'

import { mapApiErrorToDetailError, type DetailFetchError } from './errorView'
import { logError } from './logError'
import { mapResponseToViewModel } from './mapResponseToViewModel'

import type { ScrollAnchorSnapshot, SessionDetailStatus, SessionDetailViewModel } from './types'

interface UseSessionDetailParams {
  sessionId?: string
  initialVariant?: SessionVariant
}

interface DetailState {
  status: SessionDetailStatus
  detail?: SessionDetailViewModel
  error?: DetailFetchError
}

export interface SessionDetailHookResult extends DetailState {
  variant: SessionVariant
  hasSanitizedVariant: boolean
  setVariant: (next: SessionVariant) => void
  refetch: () => Promise<SessionDetailViewModel | undefined>
  preserveScrollAnchor: (snapshot: ScrollAnchorSnapshot | null) => void
  consumeScrollAnchor: () => ScrollAnchorSnapshot | null
}

const deriveInitialStatus = (sessionId?: string): SessionDetailStatus => (sessionId ? 'loading' : 'idle')

export const useSessionDetailViewModel = ({
  sessionId,
  initialVariant = 'original',
}: UseSessionDetailParams = {}): SessionDetailHookResult => {
  const [variant, setVariant] = useState<SessionVariant>(initialVariant)
  const [hasSanitizedVariant, setHasSanitizedVariant] = useState<boolean>(true)
  const [state, setState] = useState<DetailState>(() => ({
    status: deriveInitialStatus(sessionId),
    detail: undefined,
    error: undefined,
  }))

  const detailRef = useRef<SessionDetailViewModel | undefined>(undefined)
  const requestIdRef = useRef(0)
  const sanitizedAvailableRef = useRef<boolean>(true)
  const scrollAnchorRef = useRef<ScrollAnchorSnapshot | null>(null)

  useEffect(() => {
    detailRef.current = state.detail
  }, [state.detail])

  const runFetch = useCallback(
    async (targetSessionId: string, targetVariant: SessionVariant, preservePrevious: boolean) => {
      const requestId = ++requestIdRef.current
      setState((prev) => ({
        status: 'loading',
        detail: preservePrevious ? prev.detail : undefined,
        error: undefined,
      }))

      try {
        const response = await sessionsApi.getSessionDetail({ id: targetSessionId, variant: targetVariant })
        if (requestId !== requestIdRef.current) {
          return undefined
        }
        const viewModel = mapResponseToViewModel(response, targetVariant)
        sanitizedAvailableRef.current = viewModel.sanitizedAvailable
        setHasSanitizedVariant(viewModel.sanitizedAvailable)
        setState({ status: 'success', detail: viewModel, error: undefined })
        if (!viewModel.sanitizedAvailable && targetVariant === 'sanitized') {
          setVariant('original')
        }
        return viewModel
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          throw error
        }
        logError(error, 'session-detail:fetch')
        const fetchError = mapApiErrorToDetailError(error)
        setState((prev) => ({
          status: 'error',
          detail: preservePrevious ? prev.detail : undefined,
          error: fetchError,
        }))
        throw error
      }
    },
    [],
  )

  useEffect(() => {
    if (!sessionId) {
      sanitizedAvailableRef.current = true
      setHasSanitizedVariant(true)
      scrollAnchorRef.current = null
      setState({ status: 'idle', detail: undefined, error: undefined })
      return
    }

    const preserve = detailRef.current?.sessionId === sessionId
    if (!preserve) {
      scrollAnchorRef.current = null
    }
    runFetch(sessionId, variant, preserve).catch(() => undefined)
  }, [sessionId, variant, runFetch])

  const handleSetVariant = useCallback((next: SessionVariant) => {
    setVariant((prev) => {
      if (prev === next) {
        return prev
      }
      if (next === 'sanitized' && !sanitizedAvailableRef.current) {
        return prev
      }
      return next
    })
  }, [])

  const refetch = useCallback(async () => {
    if (!sessionId) {
      return undefined
    }
    const preserve = detailRef.current?.sessionId === sessionId
    return runFetch(sessionId, variant, preserve)
  }, [runFetch, sessionId, variant])

  const preserveScrollAnchor = useCallback((snapshot: ScrollAnchorSnapshot | null) => {
    scrollAnchorRef.current = snapshot
  }, [])

  const consumeScrollAnchor = useCallback((): ScrollAnchorSnapshot | null => {
    const snapshot = scrollAnchorRef.current
    scrollAnchorRef.current = null
    return snapshot ?? null
  }, [])

  return {
    status: state.status,
    detail: state.detail,
    error: state.error,
    variant,
    hasSanitizedVariant,
    setVariant: handleSetVariant,
    refetch,
    preserveScrollAnchor,
    consumeScrollAnchor,
  }
}

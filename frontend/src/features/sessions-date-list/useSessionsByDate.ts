import type { SessionsIndexResponse } from '@/api/types/sessions'

import { useSessionsByDateRange } from './useSessionsByDateRange'

import type { FetchErrorView } from './errorView'

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
  return useSessionsByDateRange({ startDate: dateIso, endDate: dateIso })
}

export type { UseSessionsByDateParams, UseSessionsByDateResult }

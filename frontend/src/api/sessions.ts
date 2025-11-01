import { httpClient } from './httpClient'
import { buildSessionsIndexQuery } from './queryBuilders'

import type {
  JobResponse,
  SessionDetailParams,
  SessionDetailResponse,
  SessionListParams,
  SessionsIndexResponse,
} from './types/sessions'

const encodeId = (value: string): string => encodeURIComponent(value)

export const sessionsApi = {
  async list(params: SessionListParams = {}): Promise<SessionsIndexResponse> {
    const query = buildSessionsIndexQuery(params)
    return httpClient.request<SessionsIndexResponse>('/api/sessions', {
      method: 'GET',
      query,
    })
  },

  async getSessionDetail(params: SessionDetailParams): Promise<SessionDetailResponse> {
    const { id, variant = 'original' } = params
    const query = variant === 'sanitized' ? { variant } : undefined

    return httpClient.request<SessionDetailResponse>(`/api/sessions/${encodeId(id)}`, {
      method: 'GET',
      query,
    })
  },

  async requestRefresh(): Promise<JobResponse> {
    return httpClient.request<JobResponse>('/api/sessions/refresh', {
      method: 'POST',
    })
  },

  async getRefreshStatus(jobId: string): Promise<JobResponse> {
    return httpClient.request<JobResponse>(`/api/sessions/refresh/${encodeId(jobId)}`, {
      method: 'GET',
    })
  },
}

export type SessionsApi = typeof sessionsApi

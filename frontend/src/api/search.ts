import { httpClient } from './httpClient'
import { buildSearchQuery } from './queryBuilders'

import type { SearchParams, SearchResponse } from './types/search'

const resolveSearchTimeout = (): number => {
  if (typeof import.meta !== 'undefined') {
    const mode = (import.meta as { env?: { MODE?: string } }).env?.MODE
    if (mode === 'test') {
      return 100
    }
  }
  return 10_000
}

const SEARCH_TIMEOUT_MS = resolveSearchTimeout()

export const searchApi = {
  async search(this: void, params: SearchParams): Promise<SearchResponse> {
    const query = buildSearchQuery(params)
    return httpClient.request<SearchResponse>('/api/search', {
      method: 'GET',
      query,
      timeoutMs: SEARCH_TIMEOUT_MS,
    })
  },
}

export type SearchApi = typeof searchApi

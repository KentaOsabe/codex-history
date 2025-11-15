import type { ApiEnvelope, SessionSpeakerRole } from './sessions'

export type SearchScope = 'chat_messages'

export interface SearchResultAttributes {
  session_id: string
  scope: SearchScope
  highlight: string
  occurred_at: string
  message_role: SessionSpeakerRole
  message_id: string
  relative_path: string
  occurrence_index: number
}

export interface SearchResultResource {
  id: string
  type: 'search_result'
  attributes: SearchResultAttributes
  links?: {
    session?: string
  }
}

export interface SearchPaginationMeta {
  page: number
  limit: number
  total_count: number
  total_pages: number
}

export interface SearchFiltersMeta {
  keyword: string
  scope: SearchScope
}

export interface SearchTimingMeta {
  duration_ms?: number
}

export interface SearchMeta {
  pagination: SearchPaginationMeta
  filters: SearchFiltersMeta
  timing?: SearchTimingMeta
}

export type SearchResponse = ApiEnvelope<SearchResultResource[], SearchMeta>

export interface SearchParams {
  keyword: string
  page?: number
  limit?: number
  scope?: SearchScope
}

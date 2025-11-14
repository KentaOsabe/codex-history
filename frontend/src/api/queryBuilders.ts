import type { SearchParams, SearchScope } from './types/search'
import type { SessionListParams, SessionSpeakerRole } from './types/sessions'

type QueryRecord = Record<string, string | number | boolean | undefined>

const joinSpeakers = (roles: SessionSpeakerRole[] | undefined): string | undefined => {
  if (!roles || roles.length === 0) return undefined
  const unique = [ ...new Set(roles) ]
  return unique.join(',')
}

const clampPerPage = (value: number | undefined): number | undefined => {
  if (value === undefined) return undefined
  if (!Number.isFinite(value)) return undefined
  if (value < 1) return 1
  if (value > 100) return 100
  return Math.floor(value)
}

const sanitizeQueryText = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const clampSearchLimit = (value: number | undefined): number | undefined => {
  if (value === undefined) return undefined
  if (!Number.isFinite(value)) return undefined
  if (value < 1) return 1
  if (value > 50) return 50
  return Math.floor(value)
}

const normalizeSearchPage = (value: number | undefined): number | undefined => {
  if (value === undefined) return undefined
  if (!Number.isFinite(value)) return undefined
  if (value <= 0) return undefined
  return Math.floor(value)
}

const DEFAULT_SEARCH_SCOPE: SearchScope = 'chat_messages'

export const buildSessionsIndexQuery = (params: SessionListParams): QueryRecord => {
  const query: QueryRecord = {}

  if (params.page && Number.isFinite(params.page) && params.page > 0) {
    query.page = Math.floor(params.page)
  }

  const perPage = clampPerPage(params.perPage)
  if (perPage !== undefined) {
    query.per_page = perPage
  }

  if (params.sort) {
    query.sort = params.sort
  }

  const speaker = joinSpeakers(params.speakerRoles)
  if (speaker) {
    query.speaker = speaker
  }

  if (params.startDate) {
    query.start_date = params.startDate
  }

  if (params.endDate) {
    query.end_date = params.endDate
  }

  const q = sanitizeQueryText(params.query)
  if (q) {
    query.q = q
  }

  return query
}

export const buildSearchQuery = (params: SearchParams): QueryRecord => {
  const query: QueryRecord = {}

  const keyword = sanitizeQueryText(params.keyword)
  if (keyword) {
    query.keyword = keyword
  }

  const page = normalizeSearchPage(params.page)
  if (page !== undefined) {
    query.page = page
  }

  const limit = clampSearchLimit(params.limit)
  if (limit !== undefined) {
    query.limit = limit
  }

  query.scope = params.scope ?? DEFAULT_SEARCH_SCOPE

  return query
}

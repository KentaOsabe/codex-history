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


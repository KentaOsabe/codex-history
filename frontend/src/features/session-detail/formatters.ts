import type { SessionDetailAttributes, SessionDetailMeta } from '@/api/types/sessions'

const pad2 = (value: number): string => value.toString().padStart(2, '0')

const normalizeDateInput = (value?: string | null): Date | undefined => {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  return date
}

export const formatDateTimeLabel = (value?: string | null): string | undefined => {
  const date = normalizeDateInput(value)
  if (!date) return undefined

  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hours = pad2(date.getHours())
  const minutes = pad2(date.getMinutes())

  return `${year}/${Number(month)}/${Number(day)} ${hours}:${minutes}`
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

export const buildDisplayTitle = (attributes: SessionDetailAttributes): string => {
  if (isNonEmptyString(attributes.title)) {
    return attributes.title.trim()
  }
  if (isNonEmptyString(attributes.relative_path)) {
    return attributes.relative_path
  }
  return attributes.session_id
}

export const deriveRelativePath = (attributes: SessionDetailAttributes, meta?: SessionDetailMeta): string => {
  const metaPath = meta?.session?.relative_path
  if (isNonEmptyString(metaPath)) {
    return metaPath
  }

  if (isNonEmptyString(attributes.relative_path)) {
    return attributes.relative_path
  }

  return attributes.session_id
}

export const deriveDownloadUrl = (meta?: SessionDetailMeta): string | undefined => {
  const downloadUrl = meta?.links?.download
  return isNonEmptyString(downloadUrl) ? downloadUrl : undefined
}

export const deriveLastUpdatedLabel = (meta?: SessionDetailMeta, attributes?: SessionDetailAttributes): string | undefined => {
  const rawMeta = meta?.session?.raw_session_meta
  const updatedAt = rawMeta && typeof rawMeta === 'object' ? (rawMeta as { updated_at?: unknown }).updated_at : undefined
  if (isNonEmptyString(updatedAt)) {
    return formatDateTimeLabel(updatedAt)
  }
  return formatDateTimeLabel(attributes?.completed_at ?? attributes?.created_at)
}

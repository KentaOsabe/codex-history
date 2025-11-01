const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeBaseUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  return trimmed.replace(/\/?$/, '')
}

export const env = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  defaultDateRange: parseNumber(import.meta.env.VITE_DEFAULT_DATE_RANGE, 7),
} as const

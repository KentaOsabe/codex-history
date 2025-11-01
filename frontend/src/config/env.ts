const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  defaultDateRange: parseNumber(import.meta.env.VITE_DEFAULT_DATE_RANGE, 7),
} as const

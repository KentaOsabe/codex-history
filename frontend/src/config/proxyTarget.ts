export const DEFAULT_PROXY_TARGET = 'http://backend:3000'

export const resolveProxyTarget = (rawTarget: string | undefined): string => {
  const normalized = rawTarget?.trim()
  if (normalized && normalized.length > 0) {
    return normalized
  }
  return DEFAULT_PROXY_TARGET
}

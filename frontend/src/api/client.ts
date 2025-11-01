import { env } from '@/config/env'

type FetcherOptions = RequestInit & { asJson?: boolean }

const ensureAbsoluteUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (env.apiBaseUrl) {
    return `${env.apiBaseUrl}${normalizedPath}`
  }
  return normalizedPath
}

export const fetcher = async <TResponse>(path: string, options: FetcherOptions = {}) => {
  const { asJson = true, headers, ...rest } = options
  const response = await fetch(ensureAbsoluteUrl(path), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`API request failed: ${response.status} ${errorBody}`)
  }

  if (!asJson) {
    return response as unknown as TResponse
  }

  return (await response.json()) as TResponse
}

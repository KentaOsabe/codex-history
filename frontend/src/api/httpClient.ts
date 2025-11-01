import { env } from '@/config/env'

import {
  ApiClientError,
  ApiConflictError,
  ApiErrorBase,
  ApiNetworkError,
  ApiServerError,
  ApiTimeoutError,
  ApiUnexpectedResponseError,
  isAbortError,
} from './errors'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type QueryValue = string | number | boolean | undefined | null

export interface HttpRequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  query?: Record<string, QueryValue>
  timeoutMs?: number
  retry?: {
    retries?: number
    delayMs?: number
    factor?: number
  }
  asJson?: boolean
}

const DEFAULT_TIMEOUT_MS: Record<HttpMethod, number> = {
  GET: 10_000,
  POST: 15_000,
  PUT: 15_000,
  PATCH: 15_000,
  DELETE: 10_000,
}

const DEFAULT_RETRYABLE_METHODS: HttpMethod[] = [ 'GET' ]
const DEFAULT_RETRIES = 1
const DEFAULT_RETRY_DELAY_MS = 200
const DEFAULT_RETRY_FACTOR = 2

const ensureAbsoluteUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (env.apiBaseUrl) {
    return `${env.apiBaseUrl}${normalized}`
  }
  return normalized
}

const buildQueryString = (query?: HttpRequestOptions['query']): string => {
  if (!query) return ''

  const params = Object.entries(query).flatMap(([ key, value ]) => {
    if (value === undefined || value === null) {
      return []
    }
    return [ `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}` ]
  })

  return params.length > 0 ? `?${params.join('&')}` : ''
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const parseJson = <T>(response: Response, bodyText: string): T => {
  if (!bodyText) {
    return {} as T
  }

  try {
    return JSON.parse(bodyText) as T
  } catch (error) {
    throw new ApiUnexpectedResponseError({
      message: 'Failed to parse JSON response',
      status: response.status,
      body: bodyText.slice(0, 1024),
      cause: error,
    })
  }
}

const extractMetaFromPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object') return undefined
  const candidate = (payload as { errors?: { meta?: unknown }[] }).errors
  return Array.isArray(candidate) && candidate.length > 0 ? candidate[0]?.meta : undefined
}

const extractCodeFromPayload = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined
  const candidate = (payload as { errors?: { code?: string }[] }).errors
  return Array.isArray(candidate) && candidate[0]?.code ? candidate[0]?.code : undefined
}

const createHttpError = async (response: Response): Promise<ApiErrorBase> => {
  const bodyText = await response.text()
  let parsed: unknown
  if (bodyText) {
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      // ignore parse errors here; unexpected response error will be thrown below for success cases
    }
  }

  const status = response.status
  const message = `HTTP ${status}`
  const meta = extractMetaFromPayload(parsed)
  const code = extractCodeFromPayload(parsed)
  const baseOptions = {
    message,
    status,
    meta,
    body: bodyText.slice(0, 1024),
    code,
  }

  if (status === 409) {
    return new ApiConflictError(baseOptions)
  }

  if (status >= 400 && status < 500) {
    return new ApiClientError(baseOptions)
  }

  return new ApiServerError({ ...baseOptions, isRetryable: status >= 500 })
}

const shouldRetry = (error: unknown, status: number | undefined, attempt: number, maxRetries: number, method: HttpMethod): boolean => {
  if (attempt >= maxRetries) {
    return false
  }

  if (!DEFAULT_RETRYABLE_METHODS.includes(method)) {
    return false
  }

  if (error instanceof ApiTimeoutError) {
    return true
  }

  if (error instanceof ApiNetworkError) {
    return true
  }

  if (status && status >= 500) {
    return true
  }

  return false
}

export const httpClient = {
  async request<TResponse>(path: string, options: HttpRequestOptions = {}): Promise<TResponse> {
    const method = (options.method ?? 'GET').toUpperCase() as HttpMethod
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS[method] ?? DEFAULT_TIMEOUT_MS.GET
    const retryConfig = options.retry ?? {}
    const maxRetries = retryConfig.retries ?? (DEFAULT_RETRYABLE_METHODS.includes(method) ? DEFAULT_RETRIES : 0)
    const baseDelay = retryConfig.delayMs ?? DEFAULT_RETRY_DELAY_MS
    const delayFactor = retryConfig.factor ?? DEFAULT_RETRY_FACTOR
    const asJson = options.asJson ?? true

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    }

    const url = `${ensureAbsoluteUrl(path)}${buildQueryString(options.query)}`
    const body = options.body === undefined || method === 'GET'
      ? undefined
      : typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)

    let attempt = 0
    let currentDelay = baseDelay
    let lastError: unknown

    while (attempt <= maxRetries) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const httpError = await createHttpError(response)
          if (shouldRetry(httpError, httpError.status, attempt, maxRetries, method)) {
            attempt += 1
            lastError = httpError
            await sleep(currentDelay)
            currentDelay *= delayFactor
            continue
          }
          throw httpError
        }

        if (!asJson) {
          return response as unknown as TResponse
        }

        const bodyText = await response.text()
        return parseJson<TResponse>(response, bodyText)
      } catch (error) {
        clearTimeout(timeoutId)

        if (isAbortError(error)) {
          const timeoutError = new ApiTimeoutError({
            message: 'Request timed out',
            status: undefined,
            cause: error,
            isRetryable: true,
          })
          if (shouldRetry(timeoutError, undefined, attempt, maxRetries, method)) {
            attempt += 1
            lastError = timeoutError
            await sleep(currentDelay)
            currentDelay *= delayFactor
            continue
          }
          throw timeoutError
        }

        if (error instanceof ApiErrorBase) {
          if (shouldRetry(error, error.status, attempt, maxRetries, method)) {
            attempt += 1
            lastError = error
            await sleep(currentDelay)
            currentDelay *= delayFactor
            continue
          }
          throw error
        }

        const networkError = new ApiNetworkError({
          message: 'Network request failed',
          cause: error,
          isRetryable: true,
        })

        if (shouldRetry(networkError, undefined, attempt, maxRetries, method)) {
          attempt += 1
          lastError = networkError
          await sleep(currentDelay)
          currentDelay *= delayFactor
          continue
        }

        throw networkError
      }
    }

    if (lastError instanceof Error) {
      throw lastError
    }

    throw new ApiNetworkError({ message: 'Request failed after retries' })
  },
}

export type HttpClient = typeof httpClient

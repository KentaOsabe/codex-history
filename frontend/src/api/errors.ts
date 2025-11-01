export interface ApiErrorOptions {
  message: string
  status?: number
  code?: string
  detail?: string
  meta?: unknown
  body?: string
  cause?: unknown
  isRetryable?: boolean
}

export class ApiErrorBase extends Error {
  status?: number
  code?: string
  detail?: string
  meta?: unknown
  body?: string
  override cause?: unknown
  isRetryable: boolean

  constructor(options: ApiErrorOptions) {
    super(options.message)
    this.name = new.target.name
    this.status = options.status
    this.code = options.code
    this.detail = options.detail
    this.meta = options.meta
    this.body = options.body
    this.cause = options.cause
    this.isRetryable = options.isRetryable ?? false
  }
}

export class ApiClientError extends ApiErrorBase {}
export class ApiConflictError extends ApiClientError {}
export class ApiServerError extends ApiErrorBase {}
export class ApiNetworkError extends ApiErrorBase {}
export class ApiTimeoutError extends ApiNetworkError {}
export class ApiUnexpectedResponseError extends ApiErrorBase {}

export const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const name = (error as { name?: string }).name
  return name === 'AbortError'
}

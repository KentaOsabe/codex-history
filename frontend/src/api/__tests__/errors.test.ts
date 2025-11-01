import { describe, expect, it } from 'vitest'

import {
  ApiClientError,
  ApiConflictError,
  ApiErrorBase,
  ApiNetworkError,
  ApiServerError,
  ApiTimeoutError,
  ApiUnexpectedResponseError,
  isAbortError,
} from '../errors'

describe('API errors', () => {
  it('ApiClientError が meta や status を保持する', () => {
    const error = new ApiClientError({
      message: 'Bad Request',
      status: 400,
      meta: { invalid_fields: { per_page: ['is too large'] } },
      code: 'invalid_parameters',
      detail: 'Invalid per_page parameter',
      body: '{"error":true}',
    })

    expect(error).toBeInstanceOf(ApiErrorBase)
    expect(error.status).toBe(400)
    expect(error.meta).toEqual({ invalid_fields: { per_page: ['is too large'] } })
    expect(error.code).toBe('invalid_parameters')
    expect(error.detail).toBe('Invalid per_page parameter')
    expect(error.body).toBe('{"error":true}')
    expect(error.isRetryable).toBe(false)
  })

  it('ApiServerError は isRetryable を設定できる', () => {
    const error = new ApiServerError({ message: 'Internal Server Error', status: 500, isRetryable: true })
    expect(error.isRetryable).toBe(true)
  })

  it('ApiConflictError は ApiClientError を継承する', () => {
    const error = new ApiConflictError({ message: 'Conflict', status: 409 })
    expect(error).toBeInstanceOf(ApiClientError)
  })

  it('ネットワークエラーとタイムアウトエラーは再試行可能として扱う', () => {
    const networkError = new ApiNetworkError({ message: 'Network down', isRetryable: true })
    const timeoutError = new ApiTimeoutError({ message: 'Timeout', isRetryable: true })

    expect(networkError.isRetryable).toBe(true)
    expect(timeoutError).toBeInstanceOf(ApiNetworkError)
    expect(timeoutError.isRetryable).toBe(true)
  })

  it('isAbortError は AbortError 名称を判定する', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
    expect(isAbortError({ name: 'OtherError' })).toBe(false)
    expect(isAbortError(null)).toBe(false)
  })

  it('ApiUnexpectedResponseError は JSON パース失敗時のボディを保持する', () => {
    const error = new ApiUnexpectedResponseError({ message: 'Unexpected', body: 'text/plain body' })
    expect(error.body).toBe('text/plain body')
  })
})

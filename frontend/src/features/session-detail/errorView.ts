import {
  ApiClientError,
  ApiErrorBase,
  ApiNetworkError,
  ApiServerError,
  ApiTimeoutError,
} from '@/api/errors'

export type DetailErrorKind = 'client' | 'server' | 'network' | 'timeout'

export interface DetailFetchError {
  kind: DetailErrorKind
  message: string
  detail?: string
}

const DEFAULT_MESSAGES: Record<DetailErrorKind, string> = {
  client: '無効なリクエストです。セッション ID や variant を確認してください。',
  server: 'セッション詳細の取得に失敗しました。時間をおいて再試行してください。',
  network: 'ネットワークエラーが発生しました。接続状況を確認してください。',
  timeout: 'セッション詳細の取得がタイムアウトしました。しばらくしてから再試行してください。',
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const buildErrorView = (kind: DetailErrorKind, error: ApiErrorBase | Error, detailOverride?: string): DetailFetchError => {
  const message = isNonEmptyString(error.message) ? error.message : DEFAULT_MESSAGES[kind]
  const detailFromError = error instanceof ApiErrorBase && isNonEmptyString(error.detail) ? error.detail : undefined

  return {
    kind,
    message: message || DEFAULT_MESSAGES[kind],
    detail: detailOverride ?? detailFromError,
  }
}

export const mapApiErrorToDetailError = (error: unknown): DetailFetchError | undefined => {
  if (!error) return undefined

  if (error instanceof ApiTimeoutError) {
    return buildErrorView('timeout', error)
  }

  if (error instanceof ApiNetworkError) {
    return buildErrorView('network', error)
  }

  if (error instanceof ApiClientError) {
    return buildErrorView('client', error)
  }

  if (error instanceof ApiServerError) {
    return buildErrorView('server', error)
  }

  if (error instanceof ApiErrorBase) {
    return buildErrorView('server', error)
  }

  if (error instanceof Error) {
    return buildErrorView('server', error)
  }

  return {
    kind: 'server',
    message: DEFAULT_MESSAGES.server,
  }
}


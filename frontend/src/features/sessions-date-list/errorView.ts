import {
  ApiClientError,
  ApiErrorBase,
  ApiNetworkError,
  ApiServerError,
  ApiTimeoutError,
} from '@/api/errors'

export type FetchErrorKind = 'client' | 'server' | 'network' | 'timeout'

export interface FetchErrorView {
  kind: FetchErrorKind
  message: string
  detail?: string
}

const DEFAULT_MESSAGES: Record<FetchErrorKind, string> = {
  client: '入力内容に誤りがあります。選択した日付を確認してください。',
  server: 'サーバーで問題が発生しました。時間をおいて再試行してください。',
  network: 'ネットワークエラーが発生しました。接続を確認して再試行してください。',
  timeout: 'セッションの取得がタイムアウトしました。しばらくしてから再試行してください。',
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const extractInvalidFieldsDetail = (meta: unknown): string | undefined => {
  if (!meta || typeof meta !== 'object') return undefined

  const invalidFields = (meta as { invalid_fields?: unknown }).invalid_fields
  if (Array.isArray(invalidFields) && invalidFields.length > 0) {
    return `問題が発生した項目: ${invalidFields.join(', ')}`
  }

  if (isNonEmptyString(invalidFields)) {
    return invalidFields
  }

  return undefined
}

const buildView = (
  kind: FetchErrorKind,
  error: ApiErrorBase | Error,
  additionalDetail?: string,
): FetchErrorView => {
  const message = isNonEmptyString(error.message) ? error.message : DEFAULT_MESSAGES[kind]
  const detailFromError = error instanceof ApiErrorBase && isNonEmptyString(error.detail) ? error.detail : undefined
  const detail = additionalDetail ?? detailFromError

  return {
    kind,
    message: message || DEFAULT_MESSAGES[kind],
    detail,
  }
}

export const mapApiErrorToFetchError = (error: unknown): FetchErrorView | undefined => {
  if (!error) return undefined

  if (error instanceof ApiTimeoutError) {
    return buildView('timeout', error)
  }

  if (error instanceof ApiNetworkError) {
    return buildView('network', error)
  }

  if (error instanceof ApiClientError) {
    const detailFromMeta = extractInvalidFieldsDetail(error.meta)
    return buildView('client', error, detailFromMeta)
  }

  if (error instanceof ApiServerError) {
    return buildView('server', error)
  }

  if (error instanceof ApiErrorBase) {
    // 未分類の API エラーはサーバー側の問題とみなす
    return buildView('server', error)
  }

  if (error instanceof Error) {
    return buildView('server', error)
  }

  return {
    kind: 'server',
    message: DEFAULT_MESSAGES.server,
  }
}

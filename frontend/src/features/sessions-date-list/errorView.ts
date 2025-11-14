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
  invalidFields?: InvalidFieldMessages
}

export type InvalidFieldMessages = Record<string, string[]>

const DEFAULT_MESSAGES: Record<FetchErrorKind, string> = {
  client: '入力内容に誤りがあります。選択した日付を確認してください。',
  server: 'サーバーで問題が発生しました。時間をおいて再試行してください。',
  network: 'ネットワークエラーが発生しました。接続を確認して再試行してください。',
  timeout: 'セッションの取得がタイムアウトしました。しばらくしてから再試行してください。',
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const extractInvalidFieldMessages = (meta: unknown): InvalidFieldMessages | undefined => {
  if (!meta || typeof meta !== 'object') return undefined

  const invalidFields = (meta as { invalid_fields?: unknown }).invalid_fields
  if (!invalidFields || typeof invalidFields !== 'object') return undefined

  const resultEntries: [string, string[]][] = Object.entries(invalidFields).flatMap(([ field, raw ]) => {
    if (Array.isArray(raw)) {
      const messages = raw.filter(isNonEmptyString)
      return messages.length > 0 ? [ [ field, messages ] ] : []
    }

    if (isNonEmptyString(raw)) {
      return [ [ field, [ raw ] ] ]
    }

    return []
  })

  return resultEntries.length > 0 ? Object.fromEntries(resultEntries) : undefined
}

const buildInvalidFieldsDetail = (invalidFields?: InvalidFieldMessages): string | undefined => {
  if (!invalidFields) return undefined
  const fieldNames = Object.keys(invalidFields)
  if (fieldNames.length === 0) return undefined
  return `問題が発生した項目: ${fieldNames.join(', ')}`
}

const buildView = (
  kind: FetchErrorKind,
  error: ApiErrorBase | Error,
  options: {
    detailOverride?: string
    invalidFields?: InvalidFieldMessages
  } = {},
): FetchErrorView => {
  const message = isNonEmptyString(error.message) ? error.message : DEFAULT_MESSAGES[kind]
  const detailFromError = error instanceof ApiErrorBase && isNonEmptyString(error.detail) ? error.detail : undefined
  const detail = options.detailOverride ?? detailFromError

  return {
    kind,
    message: message || DEFAULT_MESSAGES[kind],
    detail,
    invalidFields: options.invalidFields,
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
    const invalidFields = extractInvalidFieldMessages(error.meta)
    const detailFromMeta = buildInvalidFieldsDetail(invalidFields)
    return buildView('client', error, { detailOverride: detailFromMeta, invalidFields })
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

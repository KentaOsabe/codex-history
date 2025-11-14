import { describe, expect, it } from 'vitest'

import { ApiClientError } from '@/api/errors'

import { mapApiErrorToFetchError, extractInvalidFieldMessages } from '../errorView'

describe('mapApiErrorToFetchError', () => {
  it('invalid_fields を invalidFields として公開し、詳細文言に含める', () => {
    // 目的: フィールドエラーが UI 層で参照できるように保持することを検証する
    const apiError = new ApiClientError({
      message: 'Invalid parameters',
      status: 422,
      meta: {
        invalid_fields: {
          keyword: [ 'must be present' ],
          limit: 'must be less than or equal to 50',
        },
      },
    })

    const view = mapApiErrorToFetchError(apiError)

    expect(view?.invalidFields).toEqual({
      keyword: [ 'must be present' ],
      limit: [ 'must be less than or equal to 50' ],
    })
    expect(view?.detail).toContain('keyword')
  })
})

describe('extractInvalidFieldMessages', () => {
  it('meta から invalid_fields を抽出して Record<string, string[]> として返す', () => {
    // 目的: ユーティリティ関数が配列/文字列の両方を正規化することを検証する
    const meta = {
      invalid_fields: {
        keyword: [ 'must be present' ],
        scope: 'is not included in the list',
      },
    }

    expect(extractInvalidFieldMessages(meta)).toEqual({
      keyword: [ 'must be present' ],
      scope: [ 'is not included in the list' ],
    })
  })
})

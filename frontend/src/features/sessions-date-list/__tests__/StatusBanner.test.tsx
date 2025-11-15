import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import StatusBanner from '../StatusBanner'

import type { FetchErrorView } from '../errorView'

const networkError: FetchErrorView = {
  kind: 'network',
  message: 'ネットワークエラーが発生しました',
  detail: '接続がタイムアウトしました',
}

describe('StatusBanner', () => {
  it('エラーメッセージと詳細を表示し、再試行ボタンを提供する', () => {
    const handleRetry = vi.fn()

    render(<StatusBanner error={networkError} onRetry={handleRetry} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(networkError.message)).toBeInTheDocument()
    expect(screen.getByText(networkError.detail ?? '')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: '再読み込み' })
    fireEvent.click(retryButton)

    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('retryLabel を指定するとボタン文言を差し替える', () => {
    const handleRetry = vi.fn()

    render(<StatusBanner error={networkError} onRetry={handleRetry} retryLabel="もう一度試す" />)

    expect(screen.getByRole('button', { name: 'もう一度試す' })).toBeInTheDocument()
  })

  it('エラーが存在しないときは何も表示しない', () => {
    const { container } = render(<StatusBanner error={undefined} onRetry={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import PaginationControls from '../PaginationControls'

describe('PaginationControls', () => {
  it('前後ボタンでページ変更ハンドラーを呼び出す', () => {
    // 目的: ページャの基本操作で onPageChange が正しい値を受け取ることを保証する
    const handleChange = vi.fn()

    render(
      <PaginationControls
        page={2}
        totalPages={5}
        onPageChange={handleChange}
        label="検索結果"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '検索結果を前のページへ' }))
    fireEvent.click(screen.getByRole('button', { name: '検索結果を次のページへ' }))

    expect(handleChange).toHaveBeenNthCalledWith(1, 1)
    expect(handleChange).toHaveBeenNthCalledWith(2, 3)
  })

  it('先頭・末尾ページでは該当ボタンを無効化する', () => {
    // 目的: 境界ページでの操作不可状態をユーザーへ伝える
    const handleChange = vi.fn()

    render(
      <PaginationControls
        page={1}
        totalPages={1}
        onPageChange={handleChange}
        label="セッション一覧"
      />,
    )

    expect(screen.getByRole('button', { name: 'セッション一覧を前のページへ' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'セッション一覧を次のページへ' })).toBeDisabled()
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('ローディング中はページ切り替えを抑止する', () => {
    // 目的: フェッチ中に連打されないよう loading 状態で操作を無効化する
    const handleChange = vi.fn()

    render(
      <PaginationControls
        page={3}
        totalPages={4}
        onPageChange={handleChange}
        label="検索結果"
        isLoading
      />,
    )

    expect(screen.getByRole('button', { name: '検索結果を前のページへ' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '検索結果を次のページへ' })).toBeDisabled()
  })
})

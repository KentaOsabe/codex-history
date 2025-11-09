import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import DetailInsightsPanel from '../DetailInsightsPanel'

describe('DetailInsightsPanel', () => {
  it('detail が未定義のときにスケルトンと読み込みメッセージを表示する', () => {
    // データ準備中でもユーザーに進捗を伝えることを保証する
    render(<DetailInsightsPanel detail={undefined} status="loading" />)

    expect(screen.getByTestId('detail-panel-skeleton')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('ツール呼び出しとメタイベントの詳細を読み込み中です')).toBeInTheDocument()
  })
})

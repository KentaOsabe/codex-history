import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ResponsiveGrid from '../ResponsiveGrid'

import { setupViewportMatchMediaMock } from '@/test-utils/matchMediaMock'

describe('ResponsiveGrid', () => {
  it('現在のbreakpointに応じてdata属性とgridテンプレートを更新する', () => {
    const env = setupViewportMatchMediaMock(1280)

    render(
      <ResponsiveGrid data-testid="responsive-grid">
        <div>left</div>
        <div>right</div>
      </ResponsiveGrid>,
    )

    const grid = screen.getByTestId('responsive-grid')
    expect(grid).toHaveAttribute('data-breakpoint', 'xl')
    expect(grid).toHaveAttribute('data-columns', '2')
    expect(grid).toHaveStyle('display: grid')
    expect(grid).toHaveStyle('grid-template-columns: minmax(280px, 8fr) minmax(0, 16fr)')

    act(() => {
      env.setViewportWidth(700)
    })

    expect(grid).toHaveAttribute('data-breakpoint', 'sm')
    expect(grid).toHaveAttribute('data-columns', '1')
    expect(grid).toHaveStyle('grid-template-columns: 1fr')

    env.cleanup()
  })
})

import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { appRoutes } from '../AppRouter'

vi.mock('@/features/sessions-date-list/SessionsDateListView', () => ({
  default: () => <div data-testid="sessions-date-list-stub">SessionsDateListView Stub</div>,
}))

const renderWithPath = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}

describe('AppRouter', () => {
  it('ルート/でセッション一覧ビューを表示する', () => {
    renderWithPath('/')
    expect(screen.getByTestId('sessions-date-list-stub')).toBeInTheDocument()
  })

  it('セッション詳細ルートで詳細ビューを表示する', () => {
    renderWithPath('/sessions/demo-session')
    expect(screen.getByTestId('session-detail-placeholder')).toHaveTextContent('demo-session')
  })
})

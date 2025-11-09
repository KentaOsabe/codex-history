import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { appRoutes } from '../AppRouter'

vi.mock('@/features/sessions-date-list/SessionsDateListView', () => ({
  default: () => <div data-testid="sessions-date-list-stub">SessionsDateListView Stub</div>,
}))

vi.mock('@/features/session-detail/useSessionDetailViewModel', () => ({
  useSessionDetailViewModel: () => ({
    status: 'success',
    detail: {
      sessionId: 'demo-session',
      title: 'Mock Session',
      variant: 'original',
      sanitizedAvailable: true,
      stats: {
        messageCount: 0,
        reasoningCount: 0,
        toolCallCount: 0,
        durationSeconds: 0,
        completedAtLabel: undefined,
      },
      meta: {
        relativePath: 'mock/path',
        downloadUrl: undefined,
        lastUpdatedLabel: undefined,
      },
      messages: [],
    },
    error: undefined,
    variant: 'original',
    hasSanitizedVariant: true,
    setVariant: vi.fn(),
    refetch: vi.fn(),
    preserveScrollAnchor: vi.fn(),
    consumeScrollAnchor: vi.fn(),
  }),
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
    expect(screen.getByRole('heading', { name: 'Mock Session' })).toBeInTheDocument()
  })
})

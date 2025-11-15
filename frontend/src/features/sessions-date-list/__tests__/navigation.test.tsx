import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useSessionNavigation } from '../navigation'

const NavigationTestBed = () => {
  const { navigateToSessionDetail } = useSessionNavigation()
  const location = useLocation()

  return (
    <>
      <div data-testid="current-path">{location.pathname}</div>
      <button type="button" onClick={() => navigateToSessionDetail('session-test')}>
        詳細ページへ
      </button>
      <button type="button" onClick={() => navigateToSessionDetail('session-override', { targetPath: '/sessions/custom-path' })}>
        カスタムパス
      </button>
    </>
  )
}

const SessionDetailStub = () => {
  const location = useLocation()
  return <p data-testid="detail-location">{location.pathname}</p>
}

describe('useSessionNavigation', () => {
  it('セッション詳細ルートへ遷移する', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<NavigationTestBed />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailStub />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '詳細ページへ' }))

    await waitFor(() => {
      expect(screen.getByTestId('detail-location')).toHaveTextContent('/sessions/session-test')
    })
  })

  it('targetPath 指定時に明示的な URL を使用する', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<NavigationTestBed />} />
          <Route path="/sessions/custom-path" element={<SessionDetailStub />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'カスタムパス' }))

    await waitFor(() => {
      expect(screen.getByTestId('detail-location')).toHaveTextContent('/sessions/custom-path')
    })
  })
})

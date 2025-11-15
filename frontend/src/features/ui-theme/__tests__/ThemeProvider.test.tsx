import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import ThemeProvider, { useTheme } from '@/features/ui-theme/ThemeProvider'
import ThemeToggle from '@/features/ui-theme/ThemeToggle'
import { setupPrefersColorSchemeMock } from '@/test-utils/matchMediaMock'

const ThemeViewer = () => {
  const { mode, resolvedTheme } = useTheme()

  return (
    <div>
      <span data-testid="theme-mode">{mode}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    document.body.removeAttribute('data-theme')
  })

  it('prefers system color scheme when no explicit preference exists', () => {
    const env = setupPrefersColorSchemeMock('dark')

    render(
      <ThemeProvider>
        <ThemeViewer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('system')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
    expect(document.body.dataset.theme).toBe('dark')

    env.cleanup()
  })

  it('restores persisted preference from localStorage', () => {
    window.localStorage.setItem(
      'codex:theme-preference',
      JSON.stringify({ mode: 'dark', resolved: 'dark', updatedAt: '2025-11-15T00:00:00.000Z' }),
    )
    const env = setupPrefersColorSchemeMock('light')

    render(
      <ThemeProvider>
        <ThemeViewer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark')
    expect(document.body.dataset.theme).toBe('dark')

    env.cleanup()
  })

  it('updates localStorage and body attribute when ThemeToggle is clicked', async () => {
    const env = setupPrefersColorSchemeMock('light')
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeToggle aria-label="テーマを切り替える" />
        <ThemeViewer />
      </ThemeProvider>,
    )

    const toggle = screen.getByTestId('theme-toggle')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)

    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    await waitFor(() => expect(document.body.dataset.theme).toBe('dark'))

    const stored = window.localStorage.getItem('codex:theme-preference')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored ?? '{}')).toMatchObject({ mode: 'dark', resolved: 'dark' })

    env.cleanup()
  })

  it('reacts to system color scheme changes while mode=system', async () => {
    const env = setupPrefersColorSchemeMock('light')

    render(
      <ThemeProvider>
        <ThemeViewer />
      </ThemeProvider>,
    )

    expect(document.body.dataset.theme).toBe('light')

    await act(async () => {
      env.setColorScheme('dark')
    })

    expect(document.body.dataset.theme).toBe('dark')

    env.cleanup()
  })
})

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTheme } from '@/features/ui-theme/ThemeContext'
import ThemeToggle from '@/features/ui-theme/ThemeToggle'
import { setupPrefersColorSchemeMock } from '@/test-utils/matchMediaMock'
import { renderWithTheme } from '@/test-utils/renderWithTheme'

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

    renderWithTheme(<ThemeViewer />)

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

    renderWithTheme(<ThemeViewer />)

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark')
    expect(document.body.dataset.theme).toBe('dark')

    env.cleanup()
  })

  it('updates localStorage and body attribute when ThemeToggle is clicked', async () => {
    const env = setupPrefersColorSchemeMock('light')
    const user = userEvent.setup()

    renderWithTheme(
      <>
        <ThemeToggle aria-label="テーマを切り替える" />
        <ThemeViewer />
      </>,
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

  it('reacts to system color scheme changes while mode=system', () => {
    const env = setupPrefersColorSchemeMock('light')

    renderWithTheme(<ThemeViewer />)

    expect(document.body.dataset.theme).toBe('light')

    act(() => {
      env.setColorScheme('dark')
    })

    expect(document.body.dataset.theme).toBe('dark')

    env.cleanup()
  })
  it('システムボタンでsystemモードに戻し、body属性を再同期する', async () => {
    const env = setupPrefersColorSchemeMock('dark')
    const user = userEvent.setup()

    renderWithTheme(
      <>
        <ThemeToggle aria-label="テーマを切り替える" />
        <ThemeViewer />
      </>,
      { initialMode: 'light' },
    )

    expect(document.body.dataset.theme).toBe('light')
    await user.click(screen.getByRole('button', { name: 'システム設定に合わせる' }))

    await waitFor(() => {
      expect(document.body.dataset.theme).toBe('dark')
    })
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('system')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')

    env.cleanup()
  })

  it('requestAnimationFrame経由で50ms以内にbody属性を更新する', () => {
    const env = setupPrefersColorSchemeMock('light')
    vi.useFakeTimers()
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 0)
    })

    renderWithTheme(<ThemeToggle aria-label="テーマを切り替える" />)

    fireEvent.click(screen.getByTestId('theme-toggle'))

    act(() => {
      vi.advanceTimersByTime(16)
    })

    expect(document.body.dataset.theme).toBe('dark')
    expect(raf).toHaveBeenCalled()

    raf.mockRestore()
    vi.useRealTimers()
    env.cleanup()
  })
})

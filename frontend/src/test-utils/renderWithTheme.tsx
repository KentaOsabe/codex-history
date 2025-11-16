import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'

import ThemeProvider, { type ThemeMode } from '@/features/ui-theme/ThemeProvider'
import type { ColorSchemePreference } from '@/test-utils/matchMediaMock'

const STORAGE_KEY = 'codex:theme-preference'

interface RenderWithThemeOptions extends RenderOptions {
  initialMode?: ThemeMode
  systemResolvedTheme?: ColorSchemePreference
}

export const renderWithTheme = (ui: ReactElement, options: RenderWithThemeOptions = {}) => {
  const { initialMode, systemResolvedTheme, ...renderOptions } = options

  if (initialMode) {
    const resolved = initialMode === 'system' ? systemResolvedTheme ?? 'light' : (initialMode as Exclude<ThemeMode, 'system'>)
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: initialMode, resolved, updatedAt: new Date().toISOString() }),
    )
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export default renderWithTheme

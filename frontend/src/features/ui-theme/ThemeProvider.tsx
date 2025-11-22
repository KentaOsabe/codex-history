import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'

import { ThemeContext, type ResolvedTheme, type ThemeContextValue, type ThemeMode } from './ThemeContext'

interface ThemePreferencePayload {
  mode: ThemeMode
  resolved: ResolvedTheme
  updatedAt: string
}

const STORAGE_KEY = 'codex:theme-preference'
const SYSTEM_QUERY = '(prefers-color-scheme: dark)'
const isBrowser = typeof window !== 'undefined'
const readPreference = (): ThemeMode | null => {
  if (!isBrowser) return null

  try {
    const payload = window.localStorage.getItem(STORAGE_KEY)
    if (!payload) return null
    const parsed = JSON.parse(payload) as Partial<ThemePreferencePayload>
    if (parsed && (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'system')) {
      return parsed.mode
    }
  } catch {
    // noop: fallback to system preference
  }

  return null
}

const persistPreference = (payload: ThemePreferencePayload) => {
  if (!isBrowser) return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage errors (Safari private mode, etc.)
  }
}

const getSystemTheme = (): ResolvedTheme => {
  if (!isBrowser || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia(SYSTEM_QUERY).matches ? 'dark' : 'light'
}

const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect

const ThemeProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [mode, setMode] = useState<ThemeMode>(() => readPreference() ?? 'system')
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme())
  const lastPersisted = useRef<ThemePreferencePayload>()

  // keep system preference in sync with OS setting
  useEffect(() => {
    if (!isBrowser || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaList = window.matchMedia(SYSTEM_QUERY)

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    setSystemTheme(mediaList.matches ? 'dark' : 'light')
    mediaList.addEventListener('change', handleChange)

    return () => mediaList.removeEventListener('change', handleChange)
  }, [])

  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemTheme : mode

  useIsomorphicLayoutEffect(() => {
    if (!isBrowser) return

    document.body.dataset.theme = resolvedTheme
    document.documentElement.style.setProperty('color-scheme', resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    const payload: ThemePreferencePayload = {
      mode,
      resolved: resolvedTheme,
      updatedAt: new Date().toISOString(),
    }

    if (
      lastPersisted.current &&
      lastPersisted.current.mode === payload.mode &&
      lastPersisted.current.resolved === payload.resolved
    ) {
      return
    }

    lastPersisted.current = payload
    persistPreference(payload)
  }, [mode, resolvedTheme])

  const setTheme = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode)
  }, [])

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      isSystemMode: mode === 'system',
      setTheme,
    }),
    [mode, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
export type { ThemeMode } from './ThemeContext'

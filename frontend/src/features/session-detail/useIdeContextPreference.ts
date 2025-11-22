import { useCallback, useEffect, useMemo, useState } from 'react'

import type { IdeContextPreferenceState, IdeContextSectionDefinition } from './types'

const STORAGE_KEY = 'codex:ide-context-visibility'
const isBrowser = typeof window !== 'undefined'

const readPreference = (): Record<string, boolean> => {
  if (!isBrowser) {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as Record<string, boolean>
    if (parsed && typeof parsed === 'object') {
      return Object.fromEntries(
        Object.entries(parsed)
          .filter(([key, value]) => typeof key === 'string' && typeof value === 'boolean'),
      )
    }
  } catch {
    // ignore malformed payloads
  }
  return {}
}

const persistPreference = (payload: Record<string, boolean>) => {
  if (!isBrowser) {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

const normalizePreference = (
  source: Record<string, boolean>,
  sections: IdeContextSectionDefinition[],
): Record<string, boolean> => {
  if (!sections.length) {
    return {}
  }
  const allowedKeys = new Set(sections.map((section) => section.key))
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => allowedKeys.has(key) && value === true),
  )
}

export const useIdeContextPreference = (
  sections: IdeContextSectionDefinition[],
): IdeContextPreferenceState => {
  const [alwaysVisibleMap, setAlwaysVisibleMap] = useState<Record<string, boolean>>(() => {
    return sections.length ? normalizePreference(readPreference(), sections) : {}
  })

  useEffect(() => {
    if (!sections.length) {
      setAlwaysVisibleMap({})
      return
    }
    setAlwaysVisibleMap((previous) => {
      const fromStorage = normalizePreference(readPreference(), sections)
      const keysChanged =
        Object.keys(previous).length !== Object.keys(fromStorage).length ||
        Object.keys(previous).some((key) => previous[key] !== fromStorage[key])
      if (!keysChanged) {
        return previous
      }
      persistPreference(fromStorage)
      return fromStorage
    })
  }, [sections])

  const preferenceSections = useMemo(() => {
    if (!sections.length) {
      return []
    }
    return sections.map((section) => ({
      ...section,
      alwaysVisible: Boolean(alwaysVisibleMap[section.key]),
    }))
  }, [alwaysVisibleMap, sections])

  const setAlwaysVisible = useCallback((key: string, nextValue: boolean) => {
    setAlwaysVisibleMap((previous) => {
      if (previous[key] === nextValue) {
        return previous
      }
      const next = { ...previous }
      if (nextValue) {
        next[key] = true
      } else {
        delete next[key]
      }
      persistPreference(next)
      return next
    })
  }, [])

  return {
    sections: preferenceSections,
    setAlwaysVisible,
  }
}

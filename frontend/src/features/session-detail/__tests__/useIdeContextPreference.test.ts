import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'

import { useIdeContextPreference } from '../useIdeContextPreference'

const STORAGE_KEY = 'codex:ide-context-visibility'

const sections = [
  { key: 'my-request-for-codex', heading: 'My request for Codex', defaultExpanded: true },
  { key: 'active-file', heading: 'Active file', defaultExpanded: false },
]

describe('useIdeContextPreference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('localStorage からプリファレンスを復元し、更新を永続化する', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'active-file': true }))

    const { result } = renderHook(() => useIdeContextPreference(sections))

    const activeSection = result.current.sections.find((section) => section.key === 'active-file')
    expect(activeSection?.alwaysVisible).toBe(true)

    act(() => {
      result.current.setAlwaysVisible('my-request-for-codex', true)
    })

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored).toMatchObject({ 'active-file': true, 'my-request-for-codex': true })
  })
})

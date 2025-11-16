import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import useResponsiveLayout from '../useResponsiveLayout'

import { setupViewportMatchMediaMock } from '@/test-utils/matchMediaMock'

describe('useResponsiveLayout', () => {
  it('matchMediaが無い環境ではxsのフォールバックを返す', () => {
    const originalMatchMedia = window.matchMedia
    Reflect.deleteProperty(window, 'matchMedia')

    const { result } = renderHook(() => useResponsiveLayout())

    expect(result.current.breakpoint).toBe('xs')
    expect(result.current.columns).toBe(1)
    expect(result.current.isStackedPanels).toBe(true)

    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      })
    }
  })

  it('viewport幅に応じてbreakpointとcolumnsを更新する', () => {
    const env = setupViewportMatchMediaMock(900)
    const { result } = renderHook(() => useResponsiveLayout())

    expect(result.current.breakpoint).toBe('md')
    expect(result.current.columns).toBe(1)
    expect(result.current.isStackedPanels).toBe(true)

    act(() => {
      env.setViewportWidth(1300)
    })

    expect(result.current.breakpoint).toBe('xl')
    expect(result.current.columns).toBe(2)
    expect(result.current.isStackedPanels).toBe(false)

    act(() => {
      env.setViewportWidth(520)
    })

    expect(result.current.breakpoint).toBe('xs')
    expect(result.current.columns).toBe(1)
    expect(result.current.isStackedPanels).toBe(true)

    env.cleanup()
  })

  it('xsからxlまで全ブレークポイントで期待通りの状態を返す', () => {
    const env = setupViewportMatchMediaMock(360)
    const { result } = renderHook(() => useResponsiveLayout())

    expect(result.current.breakpoint).toBe('xs')
    expect(result.current.columns).toBe(1)

    act(() => {
      env.setViewportWidth(580)
    })
    expect(result.current.breakpoint).toBe('sm')

    act(() => {
      env.setViewportWidth(780)
    })
    expect(result.current.breakpoint).toBe('md')

    act(() => {
      env.setViewportWidth(1000)
    })
    expect(result.current.breakpoint).toBe('lg')

    act(() => {
      env.setViewportWidth(1280)
    })
    expect(result.current.breakpoint).toBe('xl')
    expect(result.current.columns).toBe(2)

    env.cleanup()
  })
})

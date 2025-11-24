import { useEffect, useState } from 'react'

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ResponsiveLayoutState {
  breakpoint: Breakpoint
  columns: number
  isStackedPanels: boolean
}

interface BreakpointConfig extends Omit<ResponsiveLayoutState, 'breakpoint'> {
  breakpoint: Exclude<Breakpoint, 'xs'>
  query: string
}

const DEFAULT_LAYOUT_STATE: ResponsiveLayoutState = {
  breakpoint: 'xs',
  columns: 1,
  isStackedPanels: true,
}

const BREAKPOINT_CONFIGS: BreakpointConfig[] = [
  { breakpoint: 'xl', query: '(min-width: 1200px)', columns: 2, isStackedPanels: false },
  { breakpoint: 'lg', query: '(min-width: 992px)', columns: 2, isStackedPanels: false },
  { breakpoint: 'md', query: '(min-width: 768px)', columns: 1, isStackedPanels: true },
  { breakpoint: 'sm', query: '(min-width: 576px)', columns: 1, isStackedPanels: true },
]

const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

const evaluateLayoutState = (): ResponsiveLayoutState => {
  if (!hasMatchMedia()) {
    return DEFAULT_LAYOUT_STATE
  }

  for (const config of BREAKPOINT_CONFIGS) {
    if (window.matchMedia(config.query).matches) {
      return {
        breakpoint: config.breakpoint,
        columns: config.columns,
        isStackedPanels: config.isStackedPanels,
      }
    }
  }

  return DEFAULT_LAYOUT_STATE
}

const isLayoutEqual = (next: ResponsiveLayoutState, prev: ResponsiveLayoutState) =>
  next.breakpoint === prev.breakpoint && next.columns === prev.columns && next.isStackedPanels === prev.isStackedPanels

const useResponsiveLayout = (): ResponsiveLayoutState => {
  const [state, setState] = useState<ResponsiveLayoutState>(() => evaluateLayoutState())

  useEffect(() => {
    if (!hasMatchMedia()) {
      return
    }

    const unsubscribes = BREAKPOINT_CONFIGS.map((config) => {
      const media = window.matchMedia(config.query)
      const handleChange = () => {
        setState((prev) => {
          const next = evaluateLayoutState()
          return isLayoutEqual(next, prev) ? prev : next
        })
      }

      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handleChange)
      } else if (typeof media.addListener === 'function') {
        media.addListener(handleChange)
      }

      return () => {
        if (typeof media.removeEventListener === 'function') {
          media.removeEventListener('change', handleChange)
        } else if (typeof media.removeListener === 'function') {
          media.removeListener(handleChange)
        }
      }
    })

    // 初回評価で最新状態にそろえる
    setState(evaluateLayoutState())

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  return state
}

export default useResponsiveLayout

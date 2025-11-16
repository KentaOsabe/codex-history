export type ColorSchemePreference = 'light' | 'dark'

type MediaQueryListener = (event: MediaQueryListEvent) => void

interface MatchMediaEnvironment {
  setViewportWidth: (next: number) => void
  setColorScheme: (mode: ColorSchemePreference) => void
  cleanup: () => void
}

const isColorSchemeQuery = (query: string): query is '(prefers-color-scheme: dark)' | '(prefers-color-scheme: light)' =>
  /prefers-color-scheme/i.test(query)

const parseColorScheme = (query: string): ColorSchemePreference =>
  query.includes('dark') ? 'dark' : 'light'

const evaluateWidthQuery = (query: string, width: number): boolean => {
  const minMatch = /min-width:\s*(\d+)px/i.exec(query)
  const maxMatch = /max-width:\s*(\d+)px/i.exec(query)
  const minOk = minMatch ? width >= Number(minMatch[1]) : true
  const maxOk = maxMatch ? width <= Number(maxMatch[1]) : true
  return minOk && maxOk
}

class MatchMediaMock implements MediaQueryList {
  media: string
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null = null
  private readonly getMatches: () => boolean
  private readonly listeners = new Set<MediaQueryListener>()

  constructor(media: string, getMatches: () => boolean) {
    this.media = media
    this.getMatches = getMatches
  }

  get matches(): boolean {
    return this.getMatches()
  }

  addEventListener(type: 'change', listener: MediaQueryListener) {
    if (type === 'change') {
      this.listeners.add(listener)
    }
  }

  removeEventListener(type: 'change', listener: MediaQueryListener) {
    if (type === 'change') {
      this.listeners.delete(listener)
    }
  }

  addListener(listener: MediaQueryListener) {
    this.listeners.add(listener)
  }

  removeListener(listener: MediaQueryListener) {
    this.listeners.delete(listener)
  }

  dispatch(matches: boolean) {
    const event = { media: this.media, matches } as MediaQueryListEvent
    this.listeners.forEach((listener) => listener.call(this, event))
    this.onchange?.call(this, event)
  }

  dispatchEvent(event: Event): boolean {
    this.listeners.forEach((listener) => listener.call(this, event as MediaQueryListEvent))
    this.onchange?.call(this, event as MediaQueryListEvent)
    return true
  }
}

export const setupMatchMediaMock = (
  options: {
    initialWidth?: number
    initialColorScheme?: ColorSchemePreference
  } = {},
): MatchMediaEnvironment => {
  const originalMatchMedia = window.matchMedia
  let width = options.initialWidth ?? 1024
  let colorScheme: ColorSchemePreference = options.initialColorScheme ?? 'light'
  const instances = new Set<MatchMediaMock>()

  const evaluateQuery = (query: string): boolean => {
    if (isColorSchemeQuery(query)) {
      return colorScheme === parseColorScheme(query)
    }
    if (/width/i.test(query)) {
      return evaluateWidthQuery(query, width)
    }
    return false
  }

  const matchMedia = (query: string): MediaQueryList => {
    const instance = new MatchMediaMock(query, () => evaluateQuery(query))
    instances.add(instance)
    return instance
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  })

  const notify = () => {
    instances.forEach((instance) => {
      instance.dispatch(evaluateQuery(instance.media))
    })
  }

  const setViewportWidth = (next: number) => {
    if (width === next) return
    width = next
    notify()
  }

  const setColorScheme = (mode: ColorSchemePreference) => {
    if (colorScheme === mode) return
    colorScheme = mode
    notify()
  }

  const cleanup = () => {
    instances.clear()
    if (typeof originalMatchMedia === 'function') {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      })
    } else {
      Reflect.deleteProperty(window, 'matchMedia')
    }
  }

  return { setViewportWidth, setColorScheme, cleanup }
}

interface PrefersColorSchemeEnv {
  setColorScheme: (mode: ColorSchemePreference) => void
  cleanup: () => void
}

export const setupPrefersColorSchemeMock = (
  initial: ColorSchemePreference = 'light',
): PrefersColorSchemeEnv => {
  const env = setupMatchMediaMock({ initialColorScheme: initial })
  return {
    setColorScheme: env.setColorScheme,
    cleanup: env.cleanup,
  }
}

interface ViewportMatchMediaEnv {
  setViewportWidth: (next: number) => void
  cleanup: () => void
}

export const setupViewportMatchMediaMock = (initialWidth = 1280): ViewportMatchMediaEnv => {
  const env = setupMatchMediaMock({ initialWidth })
  return {
    setViewportWidth: env.setViewportWidth,
    cleanup: env.cleanup,
  }
}

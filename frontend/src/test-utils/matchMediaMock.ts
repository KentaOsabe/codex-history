export type ColorSchemePreference = 'light' | 'dark'

type MediaQueryListener = (event: MediaQueryListEvent) => void

class MatchMediaMock implements MediaQueryList {
  media: string
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null = null
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

  dispatchEvent(event: Event): boolean {
    const mediaEvent = event as MediaQueryListEvent
    this.listeners.forEach((listener) => listener.call(this, mediaEvent))
    this.onchange?.call(this, mediaEvent)
    return true
  }

  dispatch(event: MediaQueryListEvent) {
    this.dispatchEvent(event)
  }
}

interface PrefersColorSchemeEnv {
  setColorScheme: (mode: ColorSchemePreference) => void
  cleanup: () => void
}

export const setupPrefersColorSchemeMock = (
  initial: ColorSchemePreference = 'light',
): PrefersColorSchemeEnv => {
  const originalMatchMedia = window.matchMedia
  let currentScheme: ColorSchemePreference = initial
  const instances = new Set<MatchMediaMock>()
  const mediaQuery = '(prefers-color-scheme: dark)'

  const createEvent = (): MediaQueryListEvent =>
    ({ media: mediaQuery, matches: currentScheme === 'dark' } as MediaQueryListEvent)

  const matchMedia = (query: string): MediaQueryList => {
    const instance = new MatchMediaMock(query, () => currentScheme === 'dark')
    instances.add(instance)
    return instance
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  })

  const setColorScheme = (mode: ColorSchemePreference) => {
    if (currentScheme === mode) return
    currentScheme = mode
    const event = createEvent()
    instances.forEach((instance) => {
      if (instance.media === mediaQuery) {
        instance.dispatch(event)
      }
    })
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

  return { setColorScheme, cleanup }
}

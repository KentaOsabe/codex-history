import '@testing-library/jest-dom'
import { server } from '@/api/testServer'

if (!('ResizeObserver' in globalThis)) {
  type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void

  class ResizeObserverPolyfill {
    private callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }

    observe(target: Element) {
      const contentRect = {
        x: 0,
        y: 0,
        width: 1024,
        height: 768,
        top: 0,
        left: 0,
        bottom: 768,
        right: 1024,
        toJSON: () => ({
          x: 0,
          y: 0,
          width: 1024,
          height: 768,
          top: 0,
          left: 0,
          bottom: 768,
          right: 1024,
        }),
      } satisfies DOMRectReadOnly

      Object.defineProperty(target, 'clientHeight', {
        value: contentRect.height,
        configurable: true,
      })
      Object.defineProperty(target, 'clientWidth', {
        value: contentRect.width,
        configurable: true,
      })

      this.callback(
        [
          {
            target,
            contentRect,
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      )
    }

    unobserve(): void {
      // resize observer polyfill exposes unobserve for parity
      return undefined
    }

    disconnect(): void {
      // resize observer polyfill exposes disconnect for parity
      return undefined
    }
  }

  ;(globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
    ResizeObserverPolyfill
}

if (!('requestIdleCallback' in globalThis)) {
  ;(globalThis as typeof globalThis & {
    requestIdleCallback: (cb: IdleRequestCallback) => number
    cancelIdleCallback: (id: number) => void
  }).requestIdleCallback = (cb: IdleRequestCallback) =>
    setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 16 }), 1)

  ;(globalThis as typeof globalThis & {
    requestIdleCallback: (cb: IdleRequestCallback) => number
    cancelIdleCallback: (id: number) => void
  }).cancelIdleCallback = (id: number) => clearTimeout(id)
}

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

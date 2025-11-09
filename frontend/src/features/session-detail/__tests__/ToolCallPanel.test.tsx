import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import ToolCallPanel from '../ToolCallPanel'

declare global {
   
  var requestIdleCallback: ((cb: IdleRequestCallback) => number) | undefined
   
  var cancelIdleCallback: ((id: number) => void) | undefined
}

describe('ToolCallPanel', () => {
  let originalRequestIdle: typeof requestIdleCallback | undefined
  let originalCancelIdle: typeof cancelIdleCallback | undefined

  beforeAll(() => {
    originalRequestIdle = globalThis.requestIdleCallback
    originalCancelIdle = globalThis.cancelIdleCallback
  })

  afterEach(() => {
    globalThis.requestIdleCallback = originalRequestIdle
    globalThis.cancelIdleCallback = originalCancelIdle
  })

  it('文字列データは即座に描画される', () => {
    render(<ToolCallPanel title="結果" data="シリアライズ済み" />)

    expect(screen.getByText('シリアライズ済み')).toBeInTheDocument()
  })

  it('オブジェクトデータは requestIdleCallback 後に JSON 化される', async () => {
    const idleCallbacks: IdleRequestCallback[] = []
    globalThis.requestIdleCallback = vi.fn((cb: IdleRequestCallback) => {
      idleCallbacks.push(cb)
      return idleCallbacks.length
    })
    globalThis.cancelIdleCallback = vi.fn()

    render(<ToolCallPanel title="結果" data={{ foo: 'bar' }} />)

    expect(screen.getByText('整形中...')).toBeInTheDocument()

    idleCallbacks.forEach((cb) => cb({ didTimeout: false, timeRemaining: () => 50 }))

    await waitFor(() => {
      expect(screen.getByText(/"foo": "bar"/)).toBeInTheDocument()
    })
  })
})

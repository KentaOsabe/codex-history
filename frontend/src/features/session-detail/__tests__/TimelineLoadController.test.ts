import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useTimelineLoadController } from '../useTimelineLoadController'

import type { SessionDetailViewModel, SessionMessageViewModel } from '../types'

const buildMessages = (count: number): SessionMessageViewModel[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `msg-${index}`,
    timestampLabel: `2025-03-14T09:${String(index).padStart(2, '0')}:00Z`,
    role: index % 2 === 0 ? 'user' : 'assistant',
    sourceType: 'message',
    channel: index % 2 === 0 ? 'input' : 'output',
    segments: [
      {
        id: `seg-${index}`,
        channel: index % 2 === 0 ? 'input' : 'output',
        text: `本文 ${index}`,
      },
    ],
    toolCall: undefined,
    isEncryptedReasoning: false,
  }))

const buildDetail = (options: { messageCount?: number; delivered?: number } = {}): SessionDetailViewModel => {
  const delivered = options.delivered ?? 120
  return {
    sessionId: 'session-123',
    title: 'Session 123',
    variant: 'original',
    sanitizedAvailable: true,
    stats: {
      messageCount: options.messageCount ?? delivered,
      reasoningCount: 0,
      toolCallCount: 0,
      durationSeconds: 0,
    },
    meta: {
      relativePath: 'sessions/session-123.jsonl',
    },
    messages: buildMessages(delivered),
  }
}

describe('TimelineLoadController', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('detail の messageCount が配列長以下ならロード不可と判定する', () => {
    const detail = buildDetail({ messageCount: 50, delivered: 50 })
    const { result } = renderHook(() => useTimelineLoadController({ detail }))

    expect(result.current.canLoadPrev).toBe(false)
    expect(result.current.canLoadNext).toBe(false)
  })

  it('messageCount が大きい場合は canLoad フラグを true にする', () => {
    const detail = buildDetail({ messageCount: 400, delivered: 120 })
    const { result } = renderHook(() => useTimelineLoadController({ detail }))

    expect(result.current.canLoadPrev).toBe(true)
    expect(result.current.canLoadNext).toBe(true)
  })

  it('方向ごとのクールダウンで requestLoad を連続発火させない', () => {
    vi.useFakeTimers()
    const detail = buildDetail({ messageCount: 400, delivered: 120 })
    const onLoad = vi.fn()

    const { result } = renderHook(() => useTimelineLoadController({ detail, onLoad }))

    act(() => {
      result.current.requestLoad('next')
    })
    act(() => {
      result.current.requestLoad('next')
    })

    expect(onLoad).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1200)

    act(() => {
      result.current.requestLoad('next')
    })

    expect(onLoad).toHaveBeenCalledTimes(2)
  })

  it('追加メッセージを受信したらクールダウンを即座に解除する', () => {
    vi.useFakeTimers()
    const onLoad = vi.fn()
    const detail = buildDetail({ messageCount: 400, delivered: 120 })

    const { result, rerender } = renderHook(
      (props: { detail: SessionDetailViewModel }) => useTimelineLoadController({ detail: props.detail, onLoad }),
      { initialProps: { detail } },
    )

    act(() => {
      result.current.requestLoad('prev')
    })

    const updatedDetail = buildDetail({ messageCount: 400, delivered: 180 })
    rerender({ detail: updatedDetail })

    act(() => {
      result.current.requestLoad('prev')
    })

    expect(onLoad).toHaveBeenCalledTimes(2)
  })

  it('detail が存在しない場合は requestLoad を無視する', () => {
    const onLoad = vi.fn()
    const { result } = renderHook(() => useTimelineLoadController({ detail: undefined, onLoad }))

    act(() => {
      result.current.requestLoad('next')
    })

    expect(onLoad).not.toHaveBeenCalled()
  })
})

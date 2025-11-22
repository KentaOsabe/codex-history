import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { safeHtml } from '../safeHtml'
import SanitizedJsonViewer from '../SanitizedJsonViewer'

vi.mock('../safeHtml', () => ({
  safeHtml: vi.fn(() => ({ html: '<pre>mock</pre>', removed: false })),
}))

const safeHtmlMock = vi.mocked(safeHtml)

beforeEach(() => {
  safeHtmlMock.mockReset()
})

describe('SanitizedJsonViewer', () => {
  it('JSON を展開してサニタイズ結果と警告メッセージを表示する (R4)', () => {
    safeHtmlMock.mockReturnValueOnce({ html: '<pre>{"foo":"bar"}</pre>', removed: true })

    render(<SanitizedJsonViewer id="call-1-args" label="引数" value={{ foo: 'bar' }} />)

    const toggleButton = screen.getByRole('button', { name: '引数を展開' })

    fireEvent.click(toggleButton)

    expect(safeHtmlMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('{"foo":"bar"}')).toBeInTheDocument()
    expect(screen.getByText('安全のため一部の内容をマスクしました')).toBeInTheDocument()
  })

  it('10KB を超えるデータは展開時まで遅延レンダリングする (R4)', () => {
    const largeValue = 'x'.repeat(11 * 1024)

    render(
      <SanitizedJsonViewer
        id="call-2-result"
        label="出力"
        value={largeValue}
        maxBytesBeforeLazy={10 * 1024}
      />,
    )

    expect(screen.getByText('展開して読み込む')).toBeInTheDocument()
    expect(safeHtmlMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '出力を展開' }))

    expect(safeHtmlMock).toHaveBeenCalledTimes(1)
  })

  it('展開中に値が変わっても直ちに警告を維持する', () => {
    safeHtmlMock.mockReturnValueOnce({ html: '<pre>{"foo":"bar"}</pre>', removed: true })

    const { rerender } = render(<SanitizedJsonViewer id="call-3" label="引数" value={{ foo: 'bar' }} expanded />)

    expect(screen.getByText('安全のため一部の内容をマスクしました')).toBeInTheDocument()

    safeHtmlMock.mockReturnValueOnce({ html: '<pre>{"baz":1}</pre>', removed: true })

    rerender(<SanitizedJsonViewer id="call-3" label="引数" value={{ baz: 1 }} expanded />)

    expect(screen.getByText('安全のため一部の内容をマスクしました')).toBeInTheDocument()
    expect(screen.getByText('{"baz":1}')).toBeInTheDocument()
  })

  it('redacted モードでは伏字プレースホルダーを表示しトグルを無効化する (R2.4)', () => {
    render(<SanitizedJsonViewer id="call-4" label="システム" value={{ secret: true }} mode="redacted" />)

    const toggle = screen.getByRole('button', { name: 'システムを展開' })
    expect(toggle).toBeDisabled()
    expect(screen.getByText('サニタイズされたため表示できません')).toBeInTheDocument()
  })
})

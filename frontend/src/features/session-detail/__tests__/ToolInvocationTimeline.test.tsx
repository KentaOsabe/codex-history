import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ToolInvocationTimeline from '../ToolInvocationTimeline'
import type { ToolInvocationGroup } from '../types'

vi.mock('../SanitizedJsonViewer', () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => <div>{label}ビューア</div>,
}))

const buildInvocation = (overrides: Partial<ToolInvocationGroup> = {}): ToolInvocationGroup => ({
  id: overrides.id ?? 'call-1',
  callId: overrides.callId ?? 'call-1',
  name: overrides.name ?? 'shell',
  status: overrides.status ?? 'success',
  startedAtLabel: overrides.startedAtLabel ?? '2025/03/14 09:00:00',
  completedAtLabel: overrides.completedAtLabel ?? '2025/03/14 09:00:05',
  durationMs: overrides.durationMs ?? 5000,
  argumentsValue: overrides.argumentsValue ?? { command: [ 'echo' ] },
  resultValue: overrides.resultValue ?? { stdout: 'ok' },
  argumentsLabel: overrides.argumentsLabel ?? '引数',
  resultLabel: overrides.resultLabel ?? '出力',
})

describe('ToolInvocationTimeline', () => {
  it('call_id 単位のカードとステータス情報を描画する (R2)', () => {
    render(<ToolInvocationTimeline toolInvocations={[ buildInvocation() ]} />)

    expect(screen.getByRole('heading', { name: 'shell' })).toBeInTheDocument()
    expect(screen.getByText('Call ID:')).toBeInTheDocument()
    expect(screen.getByText('call-1')).toBeInTheDocument()
    expect(screen.getByText('成功')).toBeInTheDocument()
    expect(screen.getByText('所要時間')).toBeInTheDocument()
    expect(screen.getByText('5.0秒')).toBeInTheDocument()
    expect(screen.getByText('引数ビューア')).toBeInTheDocument()
    expect(screen.getByText('出力ビューア')).toBeInTheDocument()
  })

  it('ツール呼び出しが存在しない場合はプレースホルダーを表示する (R2)', () => {
    render(<ToolInvocationTimeline toolInvocations={[]} />)

    expect(screen.getByText('ツール呼び出しイベントはまだありません')).toBeInTheDocument()
  })
})

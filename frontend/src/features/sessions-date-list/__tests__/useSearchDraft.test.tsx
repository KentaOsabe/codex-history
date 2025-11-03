import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { useSearchDraft } from '../useSearchDraft'

const HookHarness = () => {
  const [ draft, setDraft ] = useSearchDraft()

  return (
    <label>
      keyword
      <input
        data-testid="search-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </label>
  )
}

describe('useSearchDraft', () => {
  it('同一コンポーネント内で入力値を保持する', async () => {
    const user = userEvent.setup()
    render(<HookHarness />)

    const input = screen.getByTestId('search-input')
    await user.type(input, 'history')
    expect(input).toHaveValue('history')

    input.blur()
    input.focus()
    expect(input).toHaveValue('history')
  })
})

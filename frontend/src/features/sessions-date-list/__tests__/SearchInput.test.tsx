import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import SearchInput from '../SearchInput'

describe('SearchInput', () => {
  it('プレースホルダーとして「キーワードで検索」を表示する', () => {
    render(<SearchInput value="" onChange={vi.fn()} />)

    expect(screen.getByPlaceholderText('キーワードで検索')).toBeInTheDocument()
  })

  it('入力値を表示し、変更時にコールバックを呼び出す', async () => {
    const user = userEvent.setup()

    const Wrapper = () => {
      const [ value, setValue ] = useState('')
      return <SearchInput value={value} onChange={setValue} />
    }

    render(<Wrapper />)

    const input = screen.getByPlaceholderText('キーワードで検索')
    await user.type(input, 'codex')

    expect(input).toHaveValue('codex')
  })
})

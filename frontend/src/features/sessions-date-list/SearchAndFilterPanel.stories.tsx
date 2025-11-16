import SearchAndFilterPanel from './SearchAndFilterPanel'

import { expect } from '@storybook/jest'
import { within } from '@storybook/testing-library'

import type { Meta, StoryObj } from '@storybook/react'

const noop = () => undefined

const meta = {
  title: 'Sessions/SearchAndFilterPanel',
  component: SearchAndFilterPanel,
  tags: ['autodocs'],
  args: {
    keyword: 'status banner',
    keywordError: undefined,
    onKeywordChange: noop,
    onSubmit: noop,
    isSearchDisabled: false,
    dateRange: { startDate: '2025-03-10', endDate: '2025-03-14' },
    dateRangeError: undefined,
    onDateRangeChange: noop,
    onClearFilters: noop,
  },
  parameters: {
    docs: {
      description: {
        component:
          'SearchAndFilterPanel は SessionsDateListView の左カラムを構成するフォームで、テーマトークンと余白ユーティリティを共有します。Viewport を切り替えてもフォーム幅が 100% を維持することを確認してください。',
      },
    },
  },
} satisfies Meta<typeof SearchAndFilterPanel>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const heading = await canvas.findByRole('heading', { name: '検索とフィルタ' })
    await expect(heading).toBeVisible()
    const searchButton = await canvas.findByRole('button', { name: '検索を実行' })
    await expect(searchButton).toBeEnabled()
  },
}

export const MobileStacked: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'xs',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(window.innerWidth).toBeLessThan(576)
    const resetButton = await canvas.findByRole('button', { name: 'フィルタをリセット' })
    await expect(resetButton).toBeVisible()
  },
}

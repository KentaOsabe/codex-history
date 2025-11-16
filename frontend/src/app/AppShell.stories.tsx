
import { expect } from '@storybook/jest'
import { within } from '@storybook/testing-library'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import SessionsDateListView from '@/features/sessions-date-list/SessionsDateListView'
import { storybookSessionHandlers } from '@/mocks/storybookHandlers'

import AppLayout from './AppLayout'

import type { Meta, StoryObj } from '@storybook/react'

const withRouter = (Story: () => JSX.Element) => (
  <MemoryRouter initialEntries={['/sessions']}>
    <Routes>
      <Route element={<Story />}>
        <Route index element={<SessionsDateListView />} />
      </Route>
    </Routes>
  </MemoryRouter>
)

const meta = {
  title: 'Navigation/AppShell',
  component: AppLayout,
  decorators: [withRouter],
  tags: [ 'autodocs' ],
  parameters: {
    msw: {
      handlers: storybookSessionHandlers(),
    },
    docs: {
      description: {
        component:
          'AppShell (AppLayout) はヒーローヘッダ + ThemeToggle を含むナビゲーションレイアウトです。テーマトークン (`--theme-typography-heading`, `--space-xl`) を共有し、SessionsDateListView を子として描画します。Theme/Viewport を切り替えても 50ms 以内に `<body data-theme>` が更新される点を確認してください。',
      },
    },
  },
} satisfies Meta<typeof AppLayout>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await canvas.findByTestId('theme-toggle')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  },
}

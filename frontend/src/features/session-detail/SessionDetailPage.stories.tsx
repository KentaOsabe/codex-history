import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { expect } from '@storybook/jest'
import { within } from '@storybook/testing-library'

import { storybookSessionDetailHandlers, storybookSessionHandlers } from '@/mocks/storybookHandlers'

import SessionDetailPage from './SessionDetailPage'

import type { Meta, StoryObj } from '@storybook/react'

const withRouter = (Story: () => JSX.Element) => (
  <MemoryRouter initialEntries={['/sessions/session-2025-03-14-001']}>
    <Routes>
      <Route path="/sessions/:sessionId" element={<Story />} />
    </Routes>
  </MemoryRouter>
)

const meta = {
  title: 'Sessions/SessionDetailPage',
  component: SessionDetailPage,
  decorators: [withRouter],
  tags: ['autodocs'],
  parameters: {
    msw: {
      handlers: [...storybookSessionHandlers(), ...storybookSessionDetailHandlers()],
    },
    docs: {
      description: {
        component:
          'SessionDetailPage は会話タイムラインと詳細パネルを統合したページです。Viewport で xs/md/xl を切り替えても hero パネルと infoBar が折り返しなく収まるかを確認します。',
      },
    },
  },
} satisfies Meta<typeof SessionDetailPage>

export default meta

type Story = StoryObj<typeof meta>

const assertDetailRender = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement)
  await canvas.findByText('Session Detail')
  await canvas.findByText(/session-2025-03-14-001/i)
}

export const Default: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'xl',
    },
  },
  play: async ({ canvasElement }) => {
    await assertDetailRender(canvasElement)
    await expect(window.innerWidth).toBeGreaterThanOrEqual(1200)
  },
}

export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'md',
    },
  },
  play: async ({ canvasElement }) => {
    await assertDetailRender(canvasElement)
    await expect(window.innerWidth).toBeGreaterThanOrEqual(768)
    await expect(window.innerWidth).toBeLessThan(1200)
  },
}

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'xs',
    },
  },
  play: async ({ canvasElement }) => {
    await assertDetailRender(canvasElement)
    await expect(window.innerWidth).toBeLessThan(576)
  },
}

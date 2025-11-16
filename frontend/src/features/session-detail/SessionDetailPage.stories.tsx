
import { expect } from '@storybook/jest'
import { userEvent, within } from '@storybook/testing-library'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

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

export const DrawerInteraction: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'md',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await assertDetailRender(canvasElement)

    const metaButton = await canvas.findByRole('button', { name: /メタイベント/ })
    await userEvent.click(metaButton)

    const drawer = await canvas.findByTestId('meta-event-drawer')
    await expect(drawer).toBeInTheDocument()

    const highlightedCard = canvas.getAllByRole('article').find((node) => node.getAttribute('data-highlighted') === 'true')
    await expect(highlightedCard).toBeDefined()

    await userEvent.click(canvas.getByRole('button', { name: '詳細を閉じる' }))

    const sanitizedToggle = await canvas.findByRole('button', { name: 'サニタイズ済み' })
    await userEvent.click(sanitizedToggle)
    await expect(sanitizedToggle).toHaveAttribute('aria-pressed', 'true')

    const sanitizedMetaButton = await canvas.findByRole('button', { name: /メタイベント/ })
    await userEvent.click(sanitizedMetaButton)

    await expect(canvas.getByText('サニタイズ版のイベントを表示中')).toBeInTheDocument()
  },
}

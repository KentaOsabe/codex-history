
import { expect } from '@storybook/jest'
import { within } from '@storybook/testing-library'
import { MemoryRouter } from 'react-router-dom'

import { storybookSessionErrorHandlers, storybookSessionHandlers } from '@/mocks/storybookHandlers'

import SessionsDateListView from './SessionsDateListView'

import type { Meta, StoryObj } from '@storybook/react'

const withRouter = (Story: () => JSX.Element) => (
  <MemoryRouter initialEntries={['/sessions']}>
    <Story />
  </MemoryRouter>
)

const meta = {
  title: 'Sessions/SessionsDateListView',
  component: SessionsDateListView,
  decorators: [withRouter],
  tags: [ 'autodocs' ],
  parameters: {
    msw: {
      handlers: storybookSessionHandlers(),
    },
    docs: {
      description: {
        component:
          'SessionsDateListView は ResponsiveGrid と `useResponsiveLayout` を利用した画面のベースです。Viewport アドオンで xs / md / xl を切り替え、ライト/ダークテーマの両方で `layout-panel` や `StatusBanner` の配色を確認してください。',
      },
    },
  },
} satisfies Meta<typeof SessionsDateListView>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SessionsApiError: Story = {
  parameters: {
    msw: {
      handlers: storybookSessionErrorHandlers(),
    },
  },
}

export const ResponsiveXL: Story = {
  name: 'Responsive/XL',
  parameters: {
    viewport: {
      defaultViewport: 'xl',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const grid = await canvas.findByTestId('sessions-responsive-grid')
    await expect(grid).toHaveAttribute('data-breakpoint', 'xl')
    await expect(grid).toHaveAttribute('data-columns', '2')
  },
}

export const ResponsiveMD: Story = {
  name: 'Responsive/MD',
  parameters: {
    viewport: {
      defaultViewport: 'md',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const grid = await canvas.findByTestId('sessions-responsive-grid')
    await expect(grid).toHaveAttribute('data-breakpoint', 'md')
    await expect(grid).toHaveAttribute('data-columns', '1')
  },
}

export const ResponsiveXS: Story = {
  name: 'Responsive/XS',
  parameters: {
    viewport: {
      defaultViewport: 'xs',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const grid = await canvas.findByTestId('sessions-responsive-grid')
    await expect(grid).toHaveAttribute('data-breakpoint', 'xs')
    await expect(grid).toHaveAttribute('data-columns', '1')
  },
}

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


import { expect } from '@storybook/jest'
import { userEvent, waitFor, within } from '@storybook/testing-library'
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

type ConversationBreakpoint = 'xl' | 'md' | 'xs'
type ConversationTheme = 'light' | 'dark'

interface ConversationStoryOptions {
  breakpoint: ConversationBreakpoint
  theme: ConversationTheme
  expectAccordion: boolean
  filterPlacement: 'timeline' | 'rail'
  drawerPlacement: 'side' | 'bottom'
  ensureSanitized?: boolean
}

const assertConversationFirstLayout = async (canvasElement: HTMLElement, options: ConversationStoryOptions) => {
  const { breakpoint, theme, expectAccordion, filterPlacement, drawerPlacement, ensureSanitized = theme === 'dark' } = options
  const canvas = within(canvasElement)
  await assertDetailRender(canvasElement)

  const summaryRail = await canvas.findByTestId('session-summary-rail')
  const accordion = summaryRail.querySelector<HTMLElement>('[data-testid="session-summary-accordion"]')

  if (expectAccordion) {
    await expect(accordion).not.toBeNull()
    await expect(accordion!).not.toHaveAttribute('open')
    if (ensureSanitized && accordion && !accordion.hasAttribute('open')) {
      const summaryToggle = accordion.querySelector<HTMLElement>('summary')
      if (summaryToggle) {
        await userEvent.click(summaryToggle)
        await expect(accordion).toHaveAttribute('open')
      }
    }
  } else {
    await expect(accordion).toBeNull()
    await expect(summaryRail.tagName).toBe('ASIDE')
  }

  if (ensureSanitized) {
    const sanitizedButton = await canvas.findByRole('button', { name: 'サニタイズ済み' })
    await userEvent.click(sanitizedButton)
    await expect(sanitizedButton).toHaveAttribute('aria-pressed', 'true')
  }

  const filterBar = await canvas.findByTestId('timeline-filter-bar')
  await expect(filterBar).toHaveAttribute('data-placement', filterPlacement)

  const metaButton = await canvas.findByRole('button', { name: /メタイベント/ })
  await userEvent.click(metaButton)

  const drawer = await canvas.findByTestId('meta-event-drawer')
  const drawerHost = drawer.closest('[data-placement]')
  await expect(drawerHost).not.toBeNull()
  await expect(drawerHost).toHaveAttribute('data-placement', drawerPlacement)

  if (ensureSanitized) {
    await expect(canvas.getByText('サニタイズ版のイベントを表示中')).toBeInTheDocument()
  } else {
    await expect(canvas.queryByText('サニタイズ版のイベントを表示中')).not.toBeInTheDocument()
  }

  await userEvent.click(canvas.getByRole('button', { name: '詳細を閉じる' }))
  await waitFor(() => expect(canvas.queryByTestId('meta-event-drawer')).not.toBeInTheDocument())
  await expect(document.body).toHaveAttribute('data-theme', theme)

  // Breakpoint トグル（Storybook グローバル）が効いているかを data 属性で確認
  const root = await canvas.findByTestId('session-detail-root')
  await expect(root).toHaveAttribute('data-breakpoint', breakpoint)
}

const createConversationFirstStory = (options: ConversationStoryOptions): Story => {
  const { breakpoint, theme } = options
  const viewportName = breakpoint
  const nameSuffix = `${breakpoint.toUpperCase()} (${theme === 'dark' ? 'Dark' : 'Light'})`
  return {
    name: `ConversationFirst${nameSuffix}`,
    parameters: {
      viewport: {
        defaultViewport: viewportName,
      },
    },
    globals: {
      breakpoint,
      theme,
    },
    play: async ({ canvasElement }) => {
      await assertConversationFirstLayout(canvasElement, options)
    },
  }
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

export const ConversationFirstXLLight = createConversationFirstStory({
  breakpoint: 'xl',
  theme: 'light',
  expectAccordion: false,
  filterPlacement: 'rail',
  drawerPlacement: 'side',
  ensureSanitized: false,
})

export const ConversationFirstXLDark = createConversationFirstStory({
  breakpoint: 'xl',
  theme: 'dark',
  expectAccordion: false,
  filterPlacement: 'rail',
  drawerPlacement: 'side',
})

export const ConversationFirstMDLight = createConversationFirstStory({
  breakpoint: 'md',
  theme: 'light',
  expectAccordion: true,
  filterPlacement: 'timeline',
  drawerPlacement: 'bottom',
  ensureSanitized: false,
})

export const ConversationFirstMDDark = createConversationFirstStory({
  breakpoint: 'md',
  theme: 'dark',
  expectAccordion: true,
  filterPlacement: 'timeline',
  drawerPlacement: 'bottom',
})

export const ConversationFirstXSLight = createConversationFirstStory({
  breakpoint: 'xs',
  theme: 'light',
  expectAccordion: true,
  filterPlacement: 'timeline',
  drawerPlacement: 'bottom',
  ensureSanitized: false,
})

export const ConversationFirstXSDark = createConversationFirstStory({
  breakpoint: 'xs',
  theme: 'dark',
  expectAccordion: true,
  filterPlacement: 'timeline',
  drawerPlacement: 'bottom',
})

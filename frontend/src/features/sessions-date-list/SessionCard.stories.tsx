import SessionCard, { type SessionListItem } from './SessionCard'

import { expect } from '@storybook/jest'
import { within } from '@storybook/testing-library'

import type { Meta, StoryObj } from '@storybook/react'

const baseItem: SessionListItem = {
  id: 'session-2025-03-14-001',
  title: 'Voiceflow アーカイブ同期ジョブ',
  fallbackLabel: '同期ジョブ 001',
  updatedAtLabel: '2025/03/14 17:38',
  messageCount: 42,
  summary: 'sessionsApi.refresh を実行し、ジョブ完了までの履歴を表示しています。',
  hasSanitized: true,
}

const meta = {
  title: 'Sessions/SessionCard',
  component: SessionCard,
  tags: [ 'autodocs' ],
  args: {
    item: baseItem,
    contextLabel: '2025-03-14',
    onSelect: () => undefined,
  },
  parameters: {
    docs: {
      description: {
        component: 'SessionCard は `layout-panel` + テーマトークン (`--theme-surface-raised`, `--space-md`) のみで配色・余白を構成します。Controls から summary や contextLabel を切り替え、ライト/ダークテーマ + Viewport で表示を比較してください。',
      },
    },
  },
} satisfies Meta<typeof SessionCard>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const cardButton = await canvas.findByRole('button', { name: /Voiceflow アーカイブ同期ジョブ/ })
    await expect(cardButton.className).toMatch(/card/i)
    await expect(cardButton).toHaveAttribute('aria-label', expect.stringContaining('開く'))
  },
}

export const SanitizedBadgeHidden: Story = {
  args: {
    item: {
      ...baseItem,
      title: 'Sanitized 未提供のセッション',
      hasSanitized: false,
    },
  },
}

export const MessageHeavy: Story = {
  args: {
    item: {
      ...baseItem,
      title: 'Support escalation meeting',
      messageCount: 286,
      summary: 'StatusBanner で 409 を通知 → 手動リトライの判断を共有した会話ログ。',
    },
    contextLabel: '期間: 2025-03-10〜2025-03-14',
  },
}

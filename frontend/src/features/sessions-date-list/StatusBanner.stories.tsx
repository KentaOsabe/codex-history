import StatusBanner from './StatusBanner'

import type { Meta, StoryObj } from '@storybook/react'

const baseError = {
  kind: 'network',
  message: 'ネットワークエラーが発生しました。再試行してください。',
  detail: 'codex-history API からの応答が 10 秒以内に返りませんでした。',
}

const meta = {
  title: 'Feedback/StatusBanner',
  component: StatusBanner,
  tags: [ 'autodocs' ],
  args: {
    error: baseError,
    isRetrying: false,
    retryLabel: '再試行',
    onRetry: () => undefined,
  },
  parameters: {
    docs: {
      description: {
        component: 'StatusBanner は `layout-pill` ユーティリティと `--theme-color-warning-*` 系トークンで構成されます。エラー種別 (client/server/network/timeout) を Controls で変えてコントラスト維持を確認してください。',
      },
    },
  },
} satisfies Meta<typeof StatusBanner>

export default meta

type Story = StoryObj<typeof meta>

export const NetworkError: Story = {}

export const ClientValidationError: Story = {
  args: {
    error: {
      kind: 'client',
      message: '日付フィルタに不正な値があります。',
      detail: '開始日は終了日より前である必要があります。',
      invalidFields: {
        start_date: [ '2025-03-20 より後の日付を指定してください' ],
      },
    },
  },
}

export const RetryInProgress: Story = {
  args: {
    isRetrying: true,
    retryLabel: '再取得中…',
  },
}

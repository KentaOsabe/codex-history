import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const storyUrl = (id: string, globals?: Record<string, string>) => {
  const params = new URLSearchParams({ id, viewMode: 'story' })
  if (globals && Object.keys(globals).length > 0) {
    const serialized = Object.entries(globals)
      .map(([key, value]) => `${key}:${value}`)
      .join(';')
    params.set('globals', serialized)
  }
  return `/iframe.html?${params.toString()}`
}
const artifactsDir = process.env.STORYBOOK_TEST_ARTIFACTS ?? 'storybook-artifacts'
const shouldCaptureVisuals = process.env.PLAYWRIGHT_VISUAL === '1'

const captureVisual = async (page: Page, name: string) => {
  if (!shouldCaptureVisuals) return
  mkdirSync(artifactsDir, { recursive: true })
  await page.screenshot({ path: path.join(artifactsDir, `${name}.png`), fullPage: true })
}

interface ConversationScenario {
  id: string
  breakpoint: 'xs' | 'md' | 'xl'
  theme: 'light' | 'dark'
  viewportWidth: number
  filterPlacement: 'timeline' | 'rail'
  drawerPlacement: 'side' | 'bottom'
  expectAccordion: boolean
  expectSanitizedBanner: boolean
}

const conversationScenarios: ConversationScenario[] = [
  {
    id: 'conversation-first-xl-light',
    breakpoint: 'xl',
    theme: 'light',
    viewportWidth: 1280,
    filterPlacement: 'rail',
    drawerPlacement: 'side',
    expectAccordion: false,
    expectSanitizedBanner: false,
  },
  {
    id: 'conversation-first-md-dark',
    breakpoint: 'md',
    theme: 'dark',
    viewportWidth: 900,
    filterPlacement: 'timeline',
    drawerPlacement: 'bottom',
    expectAccordion: true,
    expectSanitizedBanner: true,
  },
  {
    id: 'conversation-first-xs-light',
    breakpoint: 'xs',
    theme: 'light',
    viewportWidth: 360,
    filterPlacement: 'timeline',
    drawerPlacement: 'bottom',
    expectAccordion: true,
    expectSanitizedBanner: false,
  },
]

test.describe('SessionDetailPage layout telemetry', () => {
  const storyId = 'sessions-sessiondetailpage--default'

  test('xl viewport surfaces split layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(storyUrl(storyId, { breakpoint: 'xl' }))
    const root = page.locator('[data-testid="session-detail-root"]')
    await root.waitFor({ state: 'attached', timeout: 15_000 })
    await expect(root).toHaveAttribute('data-breakpoint', 'xl')
    await expect(root).toHaveAttribute('data-columns', '2')
    await captureVisual(page, 'session-detail-xl')
  })

  test('md viewport remains stacked', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 })
    await page.goto(storyUrl(storyId, { breakpoint: 'md' }))
    const root = page.locator('[data-testid="session-detail-root"]')
    await root.waitFor({ state: 'attached', timeout: 15_000 })
    await expect(root).toHaveAttribute('data-breakpoint', 'md')
    await expect(root).toHaveAttribute('data-columns', '1')
    await captureVisual(page, 'session-detail-md')
  })

  test('xs viewport collapses navigation and timeline', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 })
    await page.goto(storyUrl(storyId, { breakpoint: 'xs' }))
    const root = page.locator('[data-testid="session-detail-root"]')
    await root.waitFor({ state: 'attached', timeout: 15_000 })
    await expect(root).toHaveAttribute('data-breakpoint', 'xs')
    await expect(root).toHaveAttribute('data-columns', '1')
    await captureVisual(page, 'session-detail-xs')
  })
})

test.describe('SessionDetailPage conversation-first scenarios', () => {
  for (const scenario of conversationScenarios) {
    test(`${scenario.id}`, async ({ page }) => {
      await page.setViewportSize({ width: scenario.viewportWidth, height: 900 })
      const storyId = `sessions-sessiondetailpage--${scenario.id}`
      await page.goto(storyUrl(storyId, { breakpoint: scenario.breakpoint, theme: scenario.theme }))

      const root = page.locator('[data-testid="session-detail-root"]')
      await root.waitFor({ state: 'attached', timeout: 15_000 })
      await expect(root).toHaveAttribute('data-breakpoint', scenario.breakpoint)

      const filterBar = page.locator('[data-testid="timeline-filter-bar"]')
      await filterBar.waitFor({ state: 'visible', timeout: 15_000 })
      await expect(filterBar).toHaveAttribute('data-placement', scenario.filterPlacement)

      const accordion = page.locator('[data-testid="session-summary-accordion"]')
      if (scenario.expectAccordion) {
        await expect(accordion).toHaveCount(1)
      } else {
        await expect(accordion).toHaveCount(0)
      }

      if (scenario.expectSanitizedBanner && (await accordion.count()) > 0) {
        const isOpen = await accordion.getAttribute('open')
        if (isOpen !== 'true') {
          await accordion.locator('summary').first().click()
        }
      }

      if (scenario.expectSanitizedBanner) {
        const sanitizedButton = page.getByRole('button', { name: 'サニタイズ済み' })
        await sanitizedButton.click()
        await expect(sanitizedButton).toHaveAttribute('aria-pressed', 'true')
      }

      const detailToggle = page.getByRole('button', { name: '詳細表示に切り替え' })
      if ((await detailToggle.count()) > 0) {
        await expect(detailToggle).toBeVisible({ timeout: 15_000 })
        await detailToggle.click()
      }

      await expect(filterBar).toHaveAttribute('data-collapsed', 'false')

      const metaButton = page.getByRole('button', { name: /メタイベント/ }).first()
      await metaButton.click()

      const drawer = page.locator('[data-testid="meta-event-drawer"]')
      await drawer.waitFor({ state: 'visible', timeout: 15_000 })
      const placement = await drawer.evaluate((node) => node.parentElement?.getAttribute('data-placement'))
      expect(placement).toBe(scenario.drawerPlacement)

      const sanitizedBanner = page.locator('text=サニタイズ版のイベントを表示中')
      if (scenario.expectSanitizedBanner) {
        await expect(sanitizedBanner).toBeVisible()
      } else {
        await expect(sanitizedBanner).toHaveCount(0)
      }

      await page.getByRole('button', { name: '詳細を閉じる' }).click()
      await drawer.waitFor({ state: 'detached', timeout: 15_000 })

      await expect(page.locator('body')).toHaveAttribute('data-theme', scenario.theme)
      await captureVisual(page, `session-detail-${scenario.id}`)
    })
  }
})

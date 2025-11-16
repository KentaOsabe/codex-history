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

test.describe('SessionsDateListView breakpoints', () => {
  test('xl viewport renders 2-column grid', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(storyUrl('sessions-sessionsdatelistview--default', { breakpoint: 'xl' }))
    const grid = page.locator('[data-testid="sessions-responsive-grid"]')
    await grid.waitFor({ state: 'attached', timeout: 15_000 })
    await expect(grid).toHaveAttribute('data-breakpoint', 'xl')
    await expect(grid).toHaveAttribute('data-columns', '2')
    await captureVisual(page, 'sessionsdatelistview-xl')
  })

  test('md viewport collapses to single column', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 })
    await page.goto(storyUrl('sessions-sessionsdatelistview--default', { breakpoint: 'md' }))
    const grid = page.locator('[data-testid="sessions-responsive-grid"]')
    await grid.waitFor({ state: 'attached', timeout: 15_000 })
    await expect(grid).toHaveAttribute('data-breakpoint', 'md')
    await expect(grid).toHaveAttribute('data-columns', '1')
    await captureVisual(page, 'sessionsdatelistview-md')
  })

  test('xs viewport stacks panels vertically', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 })
    await page.goto(storyUrl('sessions-sessionsdatelistview--default', { breakpoint: 'xs' }))
    const grid = page.locator('[data-testid="sessions-responsive-grid"]')
    await grid.waitFor({ state: 'attached', timeout: 15_000 })
    await expect(grid).toHaveAttribute('data-breakpoint', 'xs')
    await expect(grid).toHaveAttribute('data-columns', '1')
    await captureVisual(page, 'sessionsdatelistview-xs')
  })
})

test.describe('SearchAndFilterPanel responsive container', () => {
  test('panel never exceeds viewport width at xs', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 })
    await page.goto(storyUrl('sessions-searchandfilterpanel--default', { breakpoint: 'xs' }))
    const panel = page.locator('[data-testid="search-and-filter-panel"]')
    await panel.waitFor({ state: 'visible', timeout: 15_000 })
    const panelWidth = await panel.evaluate((el) => el.getBoundingClientRect().width)
    expect(panelWidth).toBeLessThanOrEqual(360)
    await captureVisual(page, 'search-panel-xs')
  })
})

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

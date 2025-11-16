/* eslint-disable react-refresh/only-export-components */
import { initialize, mswDecorator } from 'msw-storybook-addon'
import { useEffect } from 'react'

import ThemeProvider, { type ThemeMode, useTheme } from '@/features/ui-theme/ThemeProvider'
import type { Breakpoint } from '@/features/layout/useResponsiveLayout'
import { setupMatchMediaMock } from '@/test-utils/matchMediaMock'

import type { Preview, Decorator } from '@storybook/react'

import '../src/styles/theme/tokens.css'
import '../src/styles/theme/typography.css'
import '../src/styles/theme/dark.css'
import '../src/styles/layout/spacing.css'
import '../src/styles/global.css'

initialize({ onUnhandledRequest: 'bypass' })

const bootstrapViewports = {
  xs: {
    name: 'XS / 360px',
    styles: {
      width: '360px',
      height: '720px',
    },
  },
  sm: {
    name: 'SM / 576px',
    styles: {
      width: '576px',
      height: '900px',
    },
  },
  md: {
    name: 'MD / 768px',
    styles: {
      width: '768px',
      height: '1024px',
    },
  },
  lg: {
    name: 'LG / 992px',
    styles: {
      width: '992px',
      height: '1080px',
    },
  },
  xl: {
    name: 'XL / 1280px',
    styles: {
      width: '1280px',
      height: '1080px',
    },
  },
}

const breakpoints: Record<Breakpoint, number> = {
  xs: 360,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1280,
}

let viewportEnv: ReturnType<typeof setupMatchMediaMock> | null = null

const ensureViewportEnv = () => {
  if (viewportEnv) return viewportEnv
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  viewportEnv = setupMatchMediaMock({ initialWidth: breakpoints.xl, initialColorScheme: prefersDark })
  return viewportEnv
}

const ThemeSynchronizer = ({ mode }: { mode: ThemeMode }) => {
  const { mode: currentMode, setTheme } = useTheme()

  useEffect(() => {
    if (mode && mode !== currentMode) {
      setTheme(mode)
    }
  }, [mode, currentMode, setTheme])

  return null
}

const withThemeProvider: Decorator = (Story, context) => {
  const selectedTheme = (context.globals.theme ?? 'system') as ThemeMode

  return (
    <ThemeProvider>
      <ThemeSynchronizer mode={selectedTheme} />
      <div style={{ minHeight: '100vh', padding: 'var(--space-lg)', backgroundColor: 'var(--theme-surface-base)' }}>
        <Story />
      </div>
    </ThemeProvider>
  )
}

const withResponsiveViewport: Decorator = (Story, context) => {
  if (typeof window === 'undefined') {
    return <Story />
  }

  const selected = (context.globals.breakpoint ?? 'xl') as Breakpoint
  const width = breakpoints[selected]
  const env = ensureViewportEnv()
  env.setViewportWidth(width)

  return (
    <div
      data-active-breakpoint={selected}
      style={{
        width,
        margin: '0 auto',
        transition: 'width 0.2s ease',
      }}
    >
      <Story />
    </div>
  )
}

const preview: Preview = {
  decorators: [mswDecorator, withResponsiveViewport, withThemeProvider],
  globals: {
    theme: 'system',
    breakpoint: 'xl',
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'ライト/ダーク/システムからテーマを選択',
      defaultValue: 'system',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'system', title: 'System' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    breakpoint: {
      name: 'Breakpoint',
      description: 'View width emulation',
      defaultValue: 'xl',
      toolbar: {
        icon: 'sidebar',
        items: Object.entries(bootstrapViewports).map(([key, value]) => ({
          value: key,
          title: value.name,
        })),
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: bootstrapViewports,
      defaultViewport: undefined,
    },
    backgrounds: {
      default: 'theme-surface',
      values: [
        { name: 'theme-surface', value: 'var(--theme-surface-base)' },
        { name: 'theme-panel', value: 'var(--theme-surface-raised)' },
      ],
    },
    docs: {
      source: {
        state: 'open',
      },
    },
  },
}

export default preview

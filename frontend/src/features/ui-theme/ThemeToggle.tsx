import type { ButtonHTMLAttributes } from 'react'

import { useTheme, type ThemeMode } from './ThemeProvider'
import styles from './ThemeToggle.module.css'

type ThemeToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> & {
  'aria-label': string
}

const joinClassNames = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ')

const supportsRaf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'

const ThemeToggle = ({ className, ...rest }: ThemeToggleProps): JSX.Element => {
  const { resolvedTheme, isSystemMode, setTheme } = useTheme()

  const scheduleThemeUpdate = (mode: ThemeMode) => {
    if (supportsRaf) {
      window.requestAnimationFrame(() => setTheme(mode))
      return
    }

    setTheme(mode)
  }

  const handleToggle = () => {
    scheduleThemeUpdate(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const handleReset = () => {
    scheduleThemeUpdate('system')
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        data-testid="theme-toggle"
        aria-pressed={resolvedTheme === 'dark'}
        className={joinClassNames(styles.toggleButton, className)}
        onClick={handleToggle}
        {...rest}
      >
        <span className={styles.label}>{resolvedTheme === 'dark' ? 'ダーク' : 'ライト'}</span>
      </button>
      <button
        type="button"
        className={styles.systemButton}
        onClick={handleReset}
        aria-pressed={isSystemMode}
        aria-label="システム設定に合わせる"
      >
        SYS
      </button>
    </div>
  )
}

export default ThemeToggle

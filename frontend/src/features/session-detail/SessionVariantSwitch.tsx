import type { SessionVariant } from '@/api/types/sessions'

import styles from './SessionVariantSwitch.module.css'

interface SessionVariantSwitchProps {
  variant: SessionVariant
  hasSanitizedVariant: boolean
  onChange: (next: SessionVariant) => void
}

const SessionVariantSwitch = ({ variant, hasSanitizedVariant, onChange }: SessionVariantSwitchProps) => {
  return (
    <div className={styles.switch} role="group" aria-label="表示モード">
      <button
        type="button"
        className={variant === 'original' ? `${styles.button} ${styles.active}` : styles.button}
        aria-pressed={variant === 'original'}
        onClick={() => onChange('original')}
      >
        オリジナル
      </button>
      <button
        type="button"
        className={variant === 'sanitized' ? `${styles.button} ${styles.active}` : styles.button}
        aria-pressed={variant === 'sanitized'}
        onClick={() => onChange('sanitized')}
        disabled={!hasSanitizedVariant}
      >
        サニタイズ済み
      </button>
    </div>
  )
}

export default SessionVariantSwitch

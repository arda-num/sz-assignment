import type { ReactNode } from 'react'
import styles from './Key.module.css'

export type KeyVariant = 'digit' | 'function' | 'operator'

interface KeyProps {
  label: ReactNode
  onPress: () => void
  variant?: KeyVariant
  ariaLabel?: string
  pressed?: boolean
  disabled?: boolean
  wide?: boolean
  tall?: boolean
}

export function Key({
  label,
  onPress,
  variant = 'digit',
  ariaLabel,
  pressed,
  disabled = false,
  wide = false,
  tall = false,
}: KeyProps) {
  const className = [styles.key, styles[variant], wide && styles.wide, tall && styles.tall]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onPress}
    >
      {label}
    </button>
  )
}

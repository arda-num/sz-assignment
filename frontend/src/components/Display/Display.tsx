import styles from './Display.module.css'

type ValueSize = 'large' | 'medium' | 'small'

interface DisplayProps {
  value: string
  expression: string
  isLoading: boolean
  hasError: boolean
}

function sizeFor(value: string): ValueSize {
  if (value.length <= 9) {
    return 'large'
  }
  return value.length <= 13 ? 'medium' : 'small'
}

export function Display({ value, expression, isLoading, hasError }: DisplayProps) {
  return (
    <div className={styles.display}>
      <div className={styles.meta}>
        {isLoading ? (
          <span className={styles.loading}>
            <span className={styles.spinner} aria-hidden="true" />
            Calculating…
          </span>
        ) : (
          <span>{expression}</span>
        )}
      </div>
      <output
        className={styles.value}
        aria-live="polite"
        data-size={sizeFor(value)}
        data-error={hasError}
      >
        {value}
      </output>
    </div>
  )
}

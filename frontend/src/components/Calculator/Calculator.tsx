import { useCalculator } from '../../hooks/useCalculator'
import { useKeyboard } from '../../hooks/useKeyboard'
import { Display } from '../Display/Display'
import { ErrorMessage } from '../ErrorMessage/ErrorMessage'
import { Keypad } from '../Keypad/Keypad'
import styles from './Calculator.module.css'

export function Calculator() {
  const calculator = useCalculator()
  useKeyboard(calculator)

  return (
    <section className={styles.calculator} aria-label="Calculator">
      <Display
        value={calculator.display}
        expression={calculator.expression}
        isLoading={calculator.isLoading}
        hasError={calculator.error !== null}
      />
      {calculator.error !== null && <ErrorMessage message={calculator.error} />}
      <Keypad
        actions={calculator}
        pendingOperator={calculator.pendingOperator}
        disabled={calculator.isLoading}
      />
    </section>
  )
}

import type { ReactNode } from 'react'
import type { BinaryOperation, UnaryOperation } from '../../api/types'
import type { CalculatorActions } from '../../hooks/useCalculator'
import type { Digit } from '../../state/calculatorState'
import { Key, type KeyVariant } from '../Key/Key'
import styles from './Keypad.module.css'

interface KeyDefinition {
  id: string
  label: ReactNode
  ariaLabel?: string
  variant: KeyVariant
  operator?: BinaryOperation
  wide?: boolean
  tall?: boolean
  alwaysEnabled?: boolean
  press: (actions: CalculatorActions) => void
}

const backspaceIcon = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    <line x1="18" y1="9" x2="12" y2="15" />
    <line x1="12" y1="9" x2="18" y2="15" />
  </svg>
)

function digit(value: Digit, wide = false): KeyDefinition {
  return {
    id: `digit-${value}`,
    label: value,
    variant: 'digit',
    wide,
    press: (actions) => {
      actions.inputDigit(value)
    },
  }
}

function operator(
  value: BinaryOperation,
  label: string,
  ariaLabel: string,
  variant: KeyVariant = 'operator',
): KeyDefinition {
  return {
    id: value,
    label,
    ariaLabel,
    variant,
    operator: value,
    press: (actions) => {
      actions.chooseOperator(value)
    },
  }
}

function unary(value: UnaryOperation, label: string, ariaLabel: string): KeyDefinition {
  return {
    id: value,
    label,
    ariaLabel,
    variant: 'function',
    press: (actions) => {
      actions.applyUnary(value)
    },
  }
}

const KEYS: KeyDefinition[] = [
  {
    id: 'clear',
    label: 'AC',
    ariaLabel: 'All clear',
    variant: 'function',
    wide: true,
    alwaysEnabled: true,
    press: (actions) => {
      actions.clear()
    },
  },
  {
    id: 'backspace',
    label: backspaceIcon,
    ariaLabel: 'Backspace',
    variant: 'function',
    press: (actions) => {
      actions.backspace()
    },
  },
  operator('divide', '÷', 'Divide'),
  unary('sqrt', '√', 'Square root'),
  operator('power', 'xʸ', 'Power', 'function'),
  unary('percent', '%', 'Percent'),
  operator('multiply', '×', 'Multiply'),
  digit('7'),
  digit('8'),
  digit('9'),
  operator('subtract', '−', 'Subtract'),
  digit('4'),
  digit('5'),
  digit('6'),
  operator('add', '+', 'Add'),
  digit('1'),
  digit('2'),
  digit('3'),
  {
    id: 'equals',
    label: '=',
    ariaLabel: 'Equals',
    variant: 'operator',
    tall: true,
    press: (actions) => {
      actions.evaluate()
    },
  },
  digit('0', true),
  {
    id: 'decimal',
    label: '.',
    ariaLabel: 'Decimal point',
    variant: 'digit',
    press: (actions) => {
      actions.inputDecimal()
    },
  },
]

interface KeypadProps {
  actions: CalculatorActions
  pendingOperator: BinaryOperation | null
  disabled: boolean
}

export function Keypad({ actions, pendingOperator, disabled }: KeypadProps) {
  return (
    <div role="group" aria-label="Keypad" className={styles.keypad}>
      {KEYS.map((key) => (
        <Key
          key={key.id}
          label={key.label}
          ariaLabel={key.ariaLabel}
          variant={key.variant}
          wide={key.wide}
          tall={key.tall}
          pressed={key.operator ? key.operator === pendingOperator : undefined}
          disabled={disabled && !key.alwaysEnabled}
          onPress={() => {
            key.press(actions)
          }}
        />
      ))}
    </div>
  )
}

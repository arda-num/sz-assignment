import { useEffect, useEffectEvent } from 'react'
import type { BinaryOperation } from '../api/types'
import type { Digit } from '../state/calculatorState'
import type { CalculatorActions } from './useCalculator'

const OPERATOR_KEYS: Partial<Record<string, BinaryOperation>> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  x: 'multiply',
  '/': 'divide',
  '^': 'power',
}

function isDigit(key: string): key is Digit {
  return /^[0-9]$/.test(key)
}

function handleKey(key: string, actions: CalculatorActions): boolean {
  if (isDigit(key)) {
    actions.inputDigit(key)
    return true
  }

  const operator = OPERATOR_KEYS[key]
  if (operator) {
    actions.chooseOperator(operator)
    return true
  }

  switch (key) {
    case '.':
    case ',':
      actions.inputDecimal()
      return true
    case 'Enter':
    case '=':
      actions.evaluate()
      return true
    case 'Backspace':
      actions.backspace()
      return true
    case 'Escape':
    case 'Delete':
      actions.clear()
      return true
    case '%':
      actions.applyUnary('percent')
      return true
    case 'r':
      actions.applyUnary('sqrt')
      return true
    default:
      return false
  }
}

export function useKeyboard(actions: CalculatorActions): void {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return
    }
    if (handleKey(event.key, actions)) {
      event.preventDefault()
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}

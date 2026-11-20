import type { BinaryOperation } from '../api/types'
import { formatNumber } from '../utils/formatNumber'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export type EntryMode = 'typing' | 'result' | 'awaitingOperand'

export interface PendingOperation {
  operand: number
  operator: BinaryOperation
}

export interface CalculatorState {
  current: string
  mode: EntryMode
  pending: PendingOperation | null
  isLoading: boolean
  error: string | null
}

export type AfterCalculation =
  { kind: 'equals' } | { kind: 'unary' } | { kind: 'operator'; operator: BinaryOperation }

export type CalculatorAction =
  | { type: 'digitEntered'; digit: Digit }
  | { type: 'decimalEntered' }
  | { type: 'backspacePressed' }
  | { type: 'cleared' }
  | { type: 'operatorSelected'; operator: BinaryOperation }
  | { type: 'calculationStarted' }
  | { type: 'calculationSucceeded'; result: number; then: AfterCalculation }
  | { type: 'calculationFailed'; message: string }

export const MAX_INPUT_DIGITS = 12

export const OPERATOR_SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
}

export const initialState: CalculatorState = {
  current: '0',
  mode: 'typing',
  pending: null,
  isLoading: false,
  error: null,
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case 'digitEntered':
      if (state.mode !== 'typing') {
        return { ...state, current: action.digit, mode: 'typing' }
      }
      if (state.current === '0') {
        return { ...state, current: action.digit }
      }
      if (countDigits(state.current) >= MAX_INPUT_DIGITS) {
        return state
      }
      return { ...state, current: state.current + action.digit }

    case 'decimalEntered':
      if (state.mode !== 'typing') {
        return { ...state, current: '0.', mode: 'typing' }
      }
      if (state.current.includes('.')) {
        return state
      }
      return { ...state, current: state.current + '.' }

    case 'backspacePressed': {
      if (state.mode !== 'typing') {
        return state
      }
      const remaining = state.current.slice(0, -1)
      return { ...state, current: remaining === '' ? '0' : remaining }
    }

    case 'cleared':
      return initialState

    case 'operatorSelected':
      if (state.mode === 'awaitingOperand' && state.pending) {
        return { ...state, pending: { ...state.pending, operator: action.operator } }
      }
      return {
        ...state,
        pending: { operand: Number(state.current), operator: action.operator },
        mode: 'awaitingOperand',
      }

    case 'calculationStarted':
      return { ...state, isLoading: true }

    case 'calculationSucceeded':
      return applyResult(state, action.result, action.then)

    case 'calculationFailed':
      return { ...initialState, error: action.message }
  }
}

function applyResult(
  state: CalculatorState,
  result: number,
  then: AfterCalculation,
): CalculatorState {
  const current = String(result)
  switch (then.kind) {
    case 'equals':
      return { ...state, current, mode: 'result', pending: null, isLoading: false }
    case 'unary':
      return { ...state, current, mode: 'result', isLoading: false }
    case 'operator':
      return {
        ...state,
        current,
        mode: 'awaitingOperand',
        pending: { operand: result, operator: then.operator },
        isLoading: false,
      }
  }
}

export function selectDisplay(state: CalculatorState): string {
  if (state.error) {
    return 'Error'
  }
  return state.mode === 'typing' ? state.current : formatNumber(Number(state.current))
}

export function selectExpression(state: CalculatorState): string {
  if (!state.pending) {
    return ''
  }
  return `${formatNumber(state.pending.operand)} ${OPERATOR_SYMBOLS[state.pending.operator]}`
}

function countDigits(text: string): number {
  return text.replace(/\D/g, '').length
}

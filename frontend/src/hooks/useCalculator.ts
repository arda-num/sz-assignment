import { useEffect, useReducer, useRef } from 'react'
import { ApiError, calculate } from '../api/calculatorClient'
import type { BinaryOperation, CalculateRequest, UnaryOperation } from '../api/types'
import {
  type AfterCalculation,
  type CalculatorState,
  type Digit,
  calculatorReducer,
  initialState,
  selectDisplay,
  selectExpression,
} from './calculatorState'

const GENERIC_ERROR = 'Something went wrong. Please try again.'

const ERROR_MESSAGES: Partial<Record<string, string>> = {
  division_by_zero: 'Cannot divide by zero',
  invalid_domain: 'Result is not a real number',
  result_out_of_range: 'Result is too large',
  network_error: 'Cannot reach the server. Check your connection and try again.',
}

function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? GENERIC_ERROR
  }
  return GENERIC_ERROR
}

export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  async function run(request: CalculateRequest, then: AfterCalculation) {
    const controller = new AbortController()
    controllerRef.current = controller
    dispatch({ type: 'calculationStarted' })

    try {
      const result = await calculate(request, controller.signal)
      if (!controller.signal.aborted) {
        dispatch({ type: 'calculationSucceeded', result, then })
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        dispatch({ type: 'calculationFailed', message: toUserMessage(error) })
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
      }
    }
  }

  // Returns the state to act on, or null while a request is in flight.
  // After an error, any key first resets the calculator so the user starts fresh.
  function beginInput(): CalculatorState | null {
    if (state.isLoading) {
      return null
    }
    if (state.error) {
      dispatch({ type: 'cleared' })
      return initialState
    }
    return state
  }

  function inputDigit(digit: Digit) {
    if (beginInput()) {
      dispatch({ type: 'digitEntered', digit })
    }
  }

  function inputDecimal() {
    if (beginInput()) {
      dispatch({ type: 'decimalEntered' })
    }
  }

  function backspace() {
    if (beginInput()) {
      dispatch({ type: 'backspacePressed' })
    }
  }

  function clear() {
    controllerRef.current?.abort()
    controllerRef.current = null
    dispatch({ type: 'cleared' })
  }

  function chooseOperator(operator: BinaryOperation) {
    const current = beginInput()
    if (!current) {
      return
    }
    if (current.pending && current.mode !== 'awaitingOperand') {
      const { operand, operator: pendingOperator } = current.pending
      void run(
        { operation: pendingOperator, a: operand, b: Number(current.current) },
        { kind: 'operator', operator },
      )
      return
    }
    dispatch({ type: 'operatorSelected', operator })
  }

  function evaluate() {
    const current = beginInput()
    if (!current?.pending || current.mode === 'awaitingOperand') {
      return
    }
    const { operand, operator } = current.pending
    void run({ operation: operator, a: operand, b: Number(current.current) }, { kind: 'equals' })
  }

  function applyUnary(operation: UnaryOperation) {
    const current = beginInput()
    if (current) {
      void run({ operation, a: Number(current.current) }, { kind: 'unary' })
    }
  }

  return {
    display: selectDisplay(state),
    expression: selectExpression(state),
    error: state.error,
    isLoading: state.isLoading,
    inputDigit,
    inputDecimal,
    backspace,
    clear,
    chooseOperator,
    evaluate,
    applyUnary,
  }
}

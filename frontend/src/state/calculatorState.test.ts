import { describe, expect, it } from 'vitest'
import {
  type CalculatorAction,
  type CalculatorState,
  type Digit,
  calculatorReducer,
  initialState,
  MAX_INPUT_DIGITS,
  selectDisplay,
  selectExpression,
} from './calculatorState'

function reduce(...actions: CalculatorAction[]): CalculatorState {
  return actions.reduce(calculatorReducer, initialState)
}

function typeNumber(text: string): CalculatorAction[] {
  return text
    .split('')
    .map((char) =>
      char === '.' ? { type: 'decimalEntered' } : { type: 'digitEntered', digit: char as Digit },
    )
}

describe('calculatorReducer', () => {
  describe('typing', () => {
    it('starts at 0', () => {
      expect(selectDisplay(initialState)).toBe('0')
    })

    it('replaces the leading zero and appends digits', () => {
      expect(selectDisplay(reduce(...typeNumber('0123')))).toBe('123')
    })

    it(`ignores digits beyond ${String(MAX_INPUT_DIGITS)}`, () => {
      const digits = '1'.repeat(MAX_INPUT_DIGITS)
      expect(selectDisplay(reduce(...typeNumber(digits + '9')))).toBe(digits)
    })

    it('does not count the decimal point towards the digit limit', () => {
      const digits = '1'.repeat(MAX_INPUT_DIGITS - 1)
      expect(selectDisplay(reduce(...typeNumber(digits + '.2')))).toBe(digits + '.2')
    })

    it('adds a decimal point once', () => {
      expect(selectDisplay(reduce(...typeNumber('1.5.2')))).toBe('1.52')
    })

    it('starts with 0. when the decimal point comes first', () => {
      expect(selectDisplay(reduce({ type: 'decimalEntered' }))).toBe('0.')
    })

    it('keeps a trailing decimal point visible while typing', () => {
      expect(selectDisplay(reduce(...typeNumber('12.')))).toBe('12.')
    })
  })

  describe('backspace', () => {
    it('removes the last character', () => {
      expect(selectDisplay(reduce(...typeNumber('12.5'), { type: 'backspacePressed' }))).toBe('12.')
    })

    it('falls back to 0 when everything is removed', () => {
      expect(selectDisplay(reduce(...typeNumber('7'), { type: 'backspacePressed' }))).toBe('0')
    })

    it('does nothing on a result', () => {
      const state = reduce({
        type: 'calculationSucceeded',
        result: 42,
        then: { kind: 'equals' },
      })
      expect(calculatorReducer(state, { type: 'backspacePressed' })).toBe(state)
    })
  })

  describe('operators', () => {
    it('stores the current number as the pending operand', () => {
      const state = reduce(...typeNumber('12'), { type: 'operatorSelected', operator: 'add' })

      expect(state.pending).toEqual({ operand: 12, operator: 'add' })
      expect(state.mode).toBe('awaitingOperand')
      expect(selectExpression(state)).toBe('12 +')
      expect(selectDisplay(state)).toBe('12')
    })

    it('starts a new number when typing after an operator', () => {
      const state = reduce(
        ...typeNumber('12'),
        { type: 'operatorSelected', operator: 'add' },
        ...typeNumber('3'),
      )
      expect(selectDisplay(state)).toBe('3')
      expect(selectExpression(state)).toBe('12 +')
    })

    it('replaces the operator when another one is chosen before the second operand', () => {
      const state = reduce(
        ...typeNumber('12'),
        { type: 'operatorSelected', operator: 'add' },
        { type: 'operatorSelected', operator: 'divide' },
      )
      expect(state.pending).toEqual({ operand: 12, operator: 'divide' })
      expect(selectExpression(state)).toBe('12 ÷')
    })

    it.each([
      ['subtract', '−'],
      ['multiply', '×'],
      ['power', '^'],
    ] as const)('shows %s as %s in the expression', (operator, symbol) => {
      const state = reduce(...typeNumber('2'), { type: 'operatorSelected', operator })
      expect(selectExpression(state)).toBe(`2 ${symbol}`)
    })
  })

  describe('calculations', () => {
    it('marks the state as loading when a calculation starts', () => {
      expect(reduce({ type: 'calculationStarted' }).isLoading).toBe(true)
    })

    it('shows the result and clears the pending operation after equals', () => {
      const state = reduce(
        ...typeNumber('2'),
        { type: 'operatorSelected', operator: 'add' },
        ...typeNumber('3'),
        { type: 'calculationStarted' },
        { type: 'calculationSucceeded', result: 5, then: { kind: 'equals' } },
      )

      expect(selectDisplay(state)).toBe('5')
      expect(state.pending).toBeNull()
      expect(state.mode).toBe('result')
      expect(state.isLoading).toBe(false)
    })

    it('keeps the pending operation after a unary result', () => {
      const state = reduce(
        ...typeNumber('2'),
        { type: 'operatorSelected', operator: 'add' },
        ...typeNumber('9'),
        { type: 'calculationStarted' },
        { type: 'calculationSucceeded', result: 3, then: { kind: 'unary' } },
      )

      expect(selectDisplay(state)).toBe('3')
      expect(state.pending).toEqual({ operand: 2, operator: 'add' })
      expect(state.mode).toBe('result')
    })

    it('chains the result into the next operation', () => {
      const state = reduce(
        ...typeNumber('2'),
        { type: 'operatorSelected', operator: 'add' },
        ...typeNumber('3'),
        { type: 'calculationStarted' },
        {
          type: 'calculationSucceeded',
          result: 5,
          then: { kind: 'operator', operator: 'multiply' },
        },
      )

      expect(state.pending).toEqual({ operand: 5, operator: 'multiply' })
      expect(state.mode).toBe('awaitingOperand')
      expect(selectExpression(state)).toBe('5 ×')
    })

    it('formats results for display but keeps full precision in state', () => {
      const state = reduce({
        type: 'calculationSucceeded',
        result: 0.30000000000000004,
        then: { kind: 'equals' },
      })

      expect(selectDisplay(state)).toBe('0.3')
      expect(Number(state.current)).toBe(0.30000000000000004)
    })

    it('starts a new number when typing after a result', () => {
      const state = reduce(
        { type: 'calculationSucceeded', result: 5, then: { kind: 'equals' } },
        ...typeNumber('7'),
      )
      expect(selectDisplay(state)).toBe('7')
    })

    it('starts with 0. when the decimal point is pressed after a result', () => {
      const state = reduce(
        { type: 'calculationSucceeded', result: 5, then: { kind: 'equals' } },
        { type: 'decimalEntered' },
      )
      expect(selectDisplay(state)).toBe('0.')
    })

    it('resets and shows the error when a calculation fails', () => {
      const state = reduce(
        ...typeNumber('1'),
        { type: 'operatorSelected', operator: 'divide' },
        ...typeNumber('0'),
        { type: 'calculationStarted' },
        { type: 'calculationFailed', message: 'Cannot divide by zero' },
      )

      expect(state).toEqual({ ...initialState, error: 'Cannot divide by zero' })
      expect(selectDisplay(state)).toBe('Error')
      expect(selectExpression(state)).toBe('')
    })
  })

  it('clears everything', () => {
    const state = reduce(
      ...typeNumber('12'),
      { type: 'operatorSelected', operator: 'add' },
      ...typeNumber('3'),
      { type: 'cleared' },
    )
    expect(state).toEqual(initialState)
  })
})

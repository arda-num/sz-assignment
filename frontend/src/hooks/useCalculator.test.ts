import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from '../api/calculatorClient'
import type { Digit } from '../state/calculatorState'
import { useCalculator } from './useCalculator'

vi.mock('../api/calculatorClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/calculatorClient')>()),
  calculate: vi.fn(),
}))

const calculateMock = vi.mocked(calculate)

type Calculator = ReturnType<typeof useCalculator>

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function setup() {
  const { result, unmount } = renderHook(() => useCalculator())

  const press = async (...steps: ((calc: Calculator) => void)[]) => {
    for (const step of steps) {
      await act(async () => {
        step(result.current)
        await Promise.resolve()
      })
    }
  }

  return { result, unmount, press, type }
}

function type(text: string): ((calc: Calculator) => void)[] {
  return text.split('').map((char) => (calc: Calculator) => {
    if (char === '.') {
      calc.inputDecimal()
    } else {
      calc.inputDigit(char as Digit)
    }
  })
}

const add = (calc: Calculator) => {
  calc.chooseOperator('add')
}
const multiply = (calc: Calculator) => {
  calc.chooseOperator('multiply')
}
const divide = (calc: Calculator) => {
  calc.chooseOperator('divide')
}
const equals = (calc: Calculator) => {
  calc.evaluate()
}
const sqrt = (calc: Calculator) => {
  calc.applyUnary('sqrt')
}

beforeEach(() => {
  calculateMock.mockReset()
})

describe('useCalculator', () => {
  it('shows typed digits without calling the API', async () => {
    const { result, press, type } = setup()

    await press(...type('12.5'))

    expect(result.current.display).toBe('12.5')
    expect(calculateMock).not.toHaveBeenCalled()
  })

  it('deletes the last typed character on backspace', async () => {
    const { result, press } = setup()

    await press(...type('12'), (calc) => {
      calc.backspace()
    })

    expect(result.current.display).toBe('1')
  })

  it('sends a binary operation on equals and shows the result', async () => {
    calculateMock.mockResolvedValue(5)
    const { result, press, type } = setup()

    await press(...type('2'), add, ...type('3'), equals)

    expect(calculateMock).toHaveBeenCalledWith(
      { operation: 'add', a: 2, b: 3 },
      expect.any(AbortSignal),
    )
    expect(result.current.display).toBe('5')
    expect(result.current.expression).toBe('')
  })

  it('evaluates chained operations left to right', async () => {
    calculateMock.mockResolvedValueOnce(5).mockResolvedValueOnce(20)
    const { result, press, type } = setup()

    await press(...type('2'), add, ...type('3'), multiply)

    expect(calculateMock).toHaveBeenLastCalledWith(
      { operation: 'add', a: 2, b: 3 },
      expect.any(AbortSignal),
    )
    expect(result.current.display).toBe('5')
    expect(result.current.expression).toBe('5 ×')

    await press(...type('4'), equals)

    expect(calculateMock).toHaveBeenLastCalledWith(
      { operation: 'multiply', a: 5, b: 4 },
      expect.any(AbortSignal),
    )
    expect(result.current.display).toBe('20')
  })

  it('sends unary operations without b and keeps the pending operation', async () => {
    calculateMock.mockResolvedValueOnce(3).mockResolvedValueOnce(5)
    const { result, press, type } = setup()

    await press(...type('2'), add, ...type('9'), sqrt)

    expect(calculateMock).toHaveBeenLastCalledWith(
      { operation: 'sqrt', a: 9 },
      expect.any(AbortSignal),
    )
    expect(result.current.display).toBe('3')
    expect(result.current.expression).toBe('2 +')

    await press(equals)

    expect(calculateMock).toHaveBeenLastCalledWith(
      { operation: 'add', a: 2, b: 3 },
      expect.any(AbortSignal),
    )
    expect(result.current.display).toBe('5')
  })

  it('sends percent as a unary operation', async () => {
    calculateMock.mockResolvedValue(0.5)
    const { result, press, type } = setup()

    await press(...type('50'), (calc) => {
      calc.applyUnary('percent')
    })

    expect(calculateMock).toHaveBeenCalledWith(
      { operation: 'percent', a: 50 },
      expect.any(AbortSignal),
    )
    expect(result.current.display).toBe('0.5')
  })

  it('sends the full-precision result into the next operation', async () => {
    calculateMock.mockResolvedValueOnce(0.30000000000000004).mockResolvedValueOnce(0.6)
    const { result, press, type } = setup()

    await press(...type('0.1'), add, ...type('0.2'), equals)
    expect(result.current.display).toBe('0.3')

    await press(add, ...type('0.3'), equals)
    expect(calculateMock).toHaveBeenLastCalledWith(
      { operation: 'add', a: 0.30000000000000004, b: 0.3 },
      expect.any(AbortSignal),
    )
  })

  it.each([
    ['equals without a pending operation', [], equals],
    ['a second equals after a result', [add, ...type('3'), equals], equals],
    ['equals right after an operator', [add], equals],
    ['changing the operator', [add], divide],
  ])('does not call the API for %s', async (_, before, step) => {
    calculateMock.mockResolvedValue(5)
    const { press } = setup()

    await press(...type('2'), ...before)
    calculateMock.mockClear()
    await press(step)

    expect(calculateMock).not.toHaveBeenCalled()
  })

  it('is loading while a request is in flight and ignores input meanwhile', async () => {
    const request = deferred<number>()
    calculateMock.mockReturnValue(request.promise)
    const { result, press, type } = setup()

    await press(...type('2'), add, ...type('3'), equals)
    expect(result.current.isLoading).toBe(true)

    await press(...type('7'), add, equals, (calc) => {
      calc.backspace()
    })
    expect(calculateMock).toHaveBeenCalledOnce()

    await act(async () => {
      request.resolve(5)
      await request.promise
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.display).toBe('5')
  })

  it('aborts the in-flight request on clear and ignores its late result', async () => {
    const request = deferred<number>()
    calculateMock.mockReturnValue(request.promise)
    const { result, press, type } = setup()

    await press(...type('2'), add, ...type('3'), equals)
    const signal = calculateMock.mock.calls[0]?.[1]

    await press((calc) => {
      calc.clear()
    })
    expect(signal?.aborted).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.display).toBe('0')

    await act(async () => {
      request.resolve(5)
      await request.promise
    })
    expect(result.current.display).toBe('0')
  })

  it('aborts the in-flight request on unmount', async () => {
    calculateMock.mockReturnValue(new Promise(() => undefined))
    const { press, type, unmount } = setup()

    await press(...type('2'), add, ...type('3'), equals)
    unmount()

    expect(calculateMock.mock.calls[0]?.[1]?.aborted).toBe(true)
  })

  describe('errors', () => {
    it.each([
      ['division_by_zero', 'Cannot divide by zero'],
      ['invalid_domain', 'Result is not a real number'],
      ['result_out_of_range', 'Result is too large'],
      ['network_error', 'Cannot reach the server. Check your connection and try again.'],
      ['unexpected_response', 'Something went wrong. Please try again.'],
    ])('shows a friendly message for %s', async (code, message) => {
      calculateMock.mockRejectedValue(new ApiError(422, code, 'raw message'))
      const { result, press, type } = setup()

      await press(...type('1'), divide, ...type('0'), equals)

      expect(result.current.error).toBe(message)
      expect(result.current.display).toBe('Error')
      expect(result.current.isLoading).toBe(false)
    })

    it('shows a generic message for non-API errors', async () => {
      calculateMock.mockRejectedValue(new Error('boom'))
      const { result, press, type } = setup()

      await press(...type('1'), add, ...type('1'), equals)

      expect(result.current.error).toBe('Something went wrong. Please try again.')
    })

    it('starts fresh on the next key after an error', async () => {
      calculateMock.mockRejectedValue(new ApiError(422, 'division_by_zero', 'division by zero'))
      const { result, press, type } = setup()

      await press(...type('1'), divide, ...type('0'), equals, ...type('7'))

      expect(result.current.error).toBeNull()
      expect(result.current.display).toBe('7')
      expect(result.current.expression).toBe('')
    })

    it('clears the error on equals after an error without calling the API again', async () => {
      calculateMock.mockRejectedValue(new ApiError(422, 'division_by_zero', 'division by zero'))
      const { result, press, type } = setup()

      await press(...type('1'), divide, ...type('0'), equals)
      calculateMock.mockClear()
      await press(equals)

      expect(result.current.error).toBeNull()
      expect(result.current.display).toBe('0')
      expect(calculateMock).not.toHaveBeenCalled()
    })
  })
})

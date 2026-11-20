import { fireEvent, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type KeyboardActions, useKeyboard } from './useKeyboard'

function setup() {
  const actions = {
    inputDigit: vi.fn(),
    inputDecimal: vi.fn(),
    backspace: vi.fn(),
    clear: vi.fn(),
    chooseOperator: vi.fn(),
    evaluate: vi.fn(),
    applyUnary: vi.fn(),
  } satisfies KeyboardActions
  const { unmount } = renderHook(() => {
    useKeyboard(actions)
  })
  return { actions, unmount }
}

function press(key: string, init: KeyboardEventInit = {}): boolean {
  return fireEvent.keyDown(window, { key, ...init })
}

describe('useKeyboard', () => {
  it.each('0123456789'.split(''))('enters digit %s', (key) => {
    const { actions } = setup()
    press(key)
    expect(actions.inputDigit).toHaveBeenCalledWith(key)
  })

  it.each([
    ['+', 'add'],
    ['-', 'subtract'],
    ['*', 'multiply'],
    ['x', 'multiply'],
    ['/', 'divide'],
    ['^', 'power'],
  ])('maps %s to the %s operator', (key, operator) => {
    const { actions } = setup()
    press(key)
    expect(actions.chooseOperator).toHaveBeenCalledWith(operator)
  })

  it.each([
    ['.', 'inputDecimal'],
    [',', 'inputDecimal'],
    ['Enter', 'evaluate'],
    ['=', 'evaluate'],
    ['Backspace', 'backspace'],
    ['Escape', 'clear'],
    ['Delete', 'clear'],
  ] as const)('maps %s to %s', (key, action) => {
    const { actions } = setup()
    press(key)
    expect(actions[action]).toHaveBeenCalledOnce()
  })

  it.each([
    ['%', 'percent'],
    ['r', 'sqrt'],
  ])('maps %s to the %s unary operation', (key, operation) => {
    const { actions } = setup()
    press(key)
    expect(actions.applyUnary).toHaveBeenCalledWith(operation)
  })

  it('prevents the browser default for handled keys', () => {
    setup()
    expect(press('Enter')).toBe(false)
    expect(press('/')).toBe(false)
  })

  it('ignores unrelated keys and leaves their default alone', () => {
    const { actions } = setup()

    expect(press('a')).toBe(true)
    expect(press('Tab')).toBe(true)

    for (const action of Object.values(actions)) {
      expect(action).not.toHaveBeenCalled()
    }
  })

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }])(
    'ignores shortcuts with modifier %o',
    (modifier) => {
      const { actions } = setup()

      expect(press('r', modifier)).toBe(true)

      expect(actions.applyUnary).not.toHaveBeenCalled()
    },
  )

  it('stops listening after unmount', () => {
    const { actions, unmount } = setup()
    unmount()

    press('5')

    expect(actions.inputDigit).not.toHaveBeenCalled()
  })
})

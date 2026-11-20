import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CalculatorActions } from '../../hooks/useCalculator'
import { Keypad } from './Keypad'

function setup(props: Partial<Parameters<typeof Keypad>[0]> = {}) {
  const actions = {
    inputDigit: vi.fn(),
    inputDecimal: vi.fn(),
    backspace: vi.fn(),
    clear: vi.fn(),
    chooseOperator: vi.fn(),
    evaluate: vi.fn(),
    applyUnary: vi.fn(),
  } satisfies CalculatorActions
  render(<Keypad actions={actions} pendingOperator={null} disabled={false} {...props} />)
  return { actions }
}

describe('Keypad', () => {
  it('renders all 21 keys', () => {
    setup()
    expect(screen.getAllByRole('button')).toHaveLength(21)
  })

  it.each('0123456789'.split(''))('enters digit %s', async (digit) => {
    const { actions } = setup()
    await userEvent.click(screen.getByRole('button', { name: digit }))
    expect(actions.inputDigit).toHaveBeenCalledWith(digit)
  })

  it.each([
    ['Add', 'add'],
    ['Subtract', 'subtract'],
    ['Multiply', 'multiply'],
    ['Divide', 'divide'],
    ['Power', 'power'],
  ])('chooses the operator for %s', async (name, operator) => {
    const { actions } = setup()
    await userEvent.click(screen.getByRole('button', { name }))
    expect(actions.chooseOperator).toHaveBeenCalledWith(operator)
  })

  it.each([
    ['Square root', 'sqrt'],
    ['Percent', 'percent'],
  ])('applies the unary operation for %s', async (name, operation) => {
    const { actions } = setup()
    await userEvent.click(screen.getByRole('button', { name }))
    expect(actions.applyUnary).toHaveBeenCalledWith(operation)
  })

  it.each([
    ['Decimal point', 'inputDecimal'],
    ['Equals', 'evaluate'],
    ['Backspace', 'backspace'],
    ['All clear', 'clear'],
  ] as const)('calls %s', async (name, action) => {
    const { actions } = setup()
    await userEvent.click(screen.getByRole('button', { name }))
    expect(actions[action]).toHaveBeenCalledOnce()
  })

  it('marks only the pending operator as pressed', () => {
    setup({ pendingOperator: 'multiply' })

    expect(screen.getByRole('button', { name: 'Multiply' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('disables every key except All clear', () => {
    setup({ disabled: true })

    const enabled = screen
      .getAllByRole('button')
      .filter((button) => !button.hasAttribute('disabled'))
    expect(enabled).toEqual([screen.getByRole('button', { name: 'All clear' })])
  })
})

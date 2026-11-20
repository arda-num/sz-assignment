import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from '../../api/calculatorClient'
import { Calculator } from './Calculator'

vi.mock('../../api/calculatorClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/calculatorClient')>()),
  calculate: vi.fn(),
}))

const calculateMock = vi.mocked(calculate)

function display() {
  return screen.getByRole('status')
}

async function click(...names: string[]) {
  for (const name of names) {
    await userEvent.click(screen.getByRole('button', { name }))
  }
}

beforeEach(() => {
  calculateMock.mockReset()
})

describe('Calculator', () => {
  it('calculates with the keypad', async () => {
    calculateMock.mockResolvedValue(5)
    render(<Calculator />)

    await click('2', 'Add', '3')
    expect(screen.getByText('2 +')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'true')

    await click('Equals')

    expect(calculateMock).toHaveBeenCalledWith(
      { operation: 'add', a: 2, b: 3 },
      expect.any(AbortSignal),
    )
    await waitFor(() => {
      expect(display()).toHaveTextContent('5')
    })
  })

  it('calculates with the keyboard', async () => {
    calculateMock.mockResolvedValue(12)
    render(<Calculator />)

    await userEvent.keyboard('3*4{Enter}')

    expect(calculateMock).toHaveBeenCalledWith(
      { operation: 'multiply', a: 3, b: 4 },
      expect.any(AbortSignal),
    )
    await waitFor(() => {
      expect(display()).toHaveTextContent('12')
    })
  })

  it('disables the keypad except All clear while calculating', async () => {
    calculateMock.mockReturnValue(new Promise(() => undefined))
    render(<Calculator />)

    await click('9', 'Square root')

    expect(screen.getByText('Calculating…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'All clear' })).toBeEnabled()

    await click('All clear')

    expect(screen.queryByText('Calculating…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7' })).toBeEnabled()
    expect(display()).toHaveTextContent('0')
  })

  it('shows an error and starts fresh on the next key', async () => {
    calculateMock.mockRejectedValue(new ApiError(422, 'division_by_zero', 'division by zero'))
    render(<Calculator />)

    await click('1', 'Divide', '0', 'Equals')

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero')
    expect(display()).toHaveTextContent('Error')

    await click('7')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(display()).toHaveTextContent('7')
  })
})

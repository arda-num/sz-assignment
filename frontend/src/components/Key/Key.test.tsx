import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Key } from './Key'

describe('Key', () => {
  it('renders a button with its label and calls onPress when clicked', async () => {
    const onPress = vi.fn()
    render(<Key label="7" onPress={onPress} />)

    await userEvent.click(screen.getByRole('button', { name: '7' }))

    expect(onPress).toHaveBeenCalledOnce()
  })

  it('uses the aria-label as its accessible name', () => {
    render(<Key label="÷" ariaLabel="Divide" variant="operator" onPress={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Divide' })).toBeInTheDocument()
  })

  it('reports the pressed state for toggle keys', () => {
    render(<Key label="+" ariaLabel="Add" variant="operator" pressed onPress={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not set aria-pressed when pressed is not given', () => {
    render(<Key label="7" onPress={vi.fn()} />)

    expect(screen.getByRole('button', { name: '7' })).not.toHaveAttribute('aria-pressed')
  })

  it('does not call onPress when disabled', async () => {
    const onPress = vi.fn()
    render(<Key label="7" disabled onPress={onPress} />)

    const button = screen.getByRole('button', { name: '7' })
    await userEvent.click(button)

    expect(button).toBeDisabled()
    expect(onPress).not.toHaveBeenCalled()
  })
})

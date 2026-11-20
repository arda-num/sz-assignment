import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Display } from './Display'

function renderDisplay(props: Partial<Parameters<typeof Display>[0]> = {}) {
  render(<Display value="3" expression="12 +" isLoading={false} hasError={false} {...props} />)
}

describe('Display', () => {
  it('shows the value in a live region and the pending expression', () => {
    renderDisplay()

    const output = screen.getByRole('status')
    expect(output).toHaveTextContent('3')
    expect(output).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('12 +')).toBeInTheDocument()
  })

  it('shows a calculating indicator instead of the expression while loading', () => {
    renderDisplay({ isLoading: true })

    expect(screen.getByText('Calculating…')).toBeInTheDocument()
    expect(screen.queryByText('12 +')).not.toBeInTheDocument()
  })

  it('hides the expression when there is an error', () => {
    renderDisplay({ value: 'Error', expression: '', hasError: true })

    expect(screen.getByRole('status')).toHaveTextContent('Error')
    expect(screen.getByRole('status')).toHaveAttribute('data-error', 'true')
  })

  it.each([
    ['123456789', 'large'],
    ['1234567890123', 'medium'],
    ['1.23456789012e+21', 'small'],
  ])('sizes %s as %s so it fits', (value, size) => {
    renderDisplay({ value })

    expect(screen.getByRole('status')).toHaveAttribute('data-size', size)
  })
})

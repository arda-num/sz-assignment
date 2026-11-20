import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorMessage } from './ErrorMessage'

describe('ErrorMessage', () => {
  it('announces the message as an alert with a hint to continue', () => {
    render(<ErrorMessage message="Cannot divide by zero" />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Cannot divide by zero')
    expect(alert).toHaveTextContent('Press any key to continue')
  })
})

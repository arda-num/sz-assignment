import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the calculator with a page heading and keyboard hint', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Calculator' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Keypad' })).toBeInTheDocument()
    expect(screen.getByText(/Keyboard:/)).toBeInTheDocument()
  })
})

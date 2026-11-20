import { describe, expect, it } from 'vitest'
import { formatNumber } from './formatNumber'

describe('formatNumber', () => {
  it.each([
    [5, '5'],
    [0, '0'],
    [-8, '-8'],
    [2.5, '2.5'],
    [0.30000000000000004, '0.3'],
    [1 / 3, '0.333333333333'],
    [123456789012, '123456789012'],
    [1e21, '1e+21'],
    [1e-7, '1e-7'],
    [0.000001, '0.000001'],
    [1234567890123, '1.23456789012e+12'],
    [1.23456789012345e20, '1.23456789012e+20'],
    [-9876543210987654, '-9.87654321099e+15'],
    [2e15, '2e+15'],
  ])('formats %d as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })
})

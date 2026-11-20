// Package calculator implements the arithmetic operations, independent of any transport.
package calculator

import (
	"errors"
	"fmt"
	"math"
)

type Operation string

const (
	Add      Operation = "add"
	Subtract Operation = "subtract"
	Multiply Operation = "multiply"
	Divide   Operation = "divide"
	Power    Operation = "power"
	Sqrt     Operation = "sqrt"
	Percent  Operation = "percent"
)

var (
	ErrUnknownOperation = errors.New("unknown operation")
	ErrDivisionByZero   = errors.New("division by zero")
	ErrInvalidDomain    = errors.New("operation is undefined for the given input")
	ErrResultOutOfRange = errors.New("result is out of range")
)

var arities = map[Operation]int{
	Add:      2,
	Subtract: 2,
	Multiply: 2,
	Divide:   2,
	Power:    2,
	Sqrt:     1,
	Percent:  1,
}

// Arity reports how many operands op takes, and false if op is unknown.
func Arity(op Operation) (int, bool) {
	n, ok := arities[op]
	return n, ok
}

// Calculate applies op to its operands. b is ignored for unary operations.
func Calculate(op Operation, a, b float64) (float64, error) {
	var result float64

	switch op {
	case Add:
		result = a + b
	case Subtract:
		result = a - b
	case Multiply:
		result = a * b
	case Divide:
		if b == 0 {
			return 0, ErrDivisionByZero
		}
		result = a / b
	case Power:
		if a == 0 && b < 0 {
			return 0, ErrDivisionByZero
		}
		result = math.Pow(a, b)
	case Sqrt:
		if a < 0 {
			return 0, fmt.Errorf("%w: square root of a negative number", ErrInvalidDomain)
		}
		result = math.Sqrt(a)
	case Percent:
		result = a / 100
	default:
		return 0, ErrUnknownOperation
	}

	if math.IsNaN(result) {
		return 0, fmt.Errorf("%w: result is not a real number", ErrInvalidDomain)
	}
	if math.IsInf(result, 0) {
		return 0, ErrResultOutOfRange
	}

	// -0 == 0, so this turns negative zero into positive zero; clients would otherwise see "-0".
	if result == 0 {
		result = 0
	}
	return result, nil
}

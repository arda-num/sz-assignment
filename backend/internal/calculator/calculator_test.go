package calculator_test

import (
	"errors"
	"math"
	"testing"

	"github.com/arda-num/sz-assignment/backend/internal/calculator"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name    string
		op      calculator.Operation
		a, b    float64
		want    float64
		wantErr error
	}{
		{name: "add integers", op: calculator.Add, a: 2, b: 3, want: 5},
		{name: "add negatives", op: calculator.Add, a: -2, b: -3, want: -5},
		{name: "add decimals", op: calculator.Add, a: 0.5, b: 0.25, want: 0.75},
		{name: "add overflow", op: calculator.Add, a: math.MaxFloat64, b: math.MaxFloat64, wantErr: calculator.ErrResultOutOfRange},

		{name: "subtract", op: calculator.Subtract, a: 5, b: 8, want: -3},
		{name: "subtract overflow", op: calculator.Subtract, a: -math.MaxFloat64, b: math.MaxFloat64, wantErr: calculator.ErrResultOutOfRange},

		{name: "multiply", op: calculator.Multiply, a: 4, b: 2.5, want: 10},
		{name: "multiply by zero", op: calculator.Multiply, a: 7, b: 0, want: 0},
		{name: "multiply overflow", op: calculator.Multiply, a: 1e308, b: 10, wantErr: calculator.ErrResultOutOfRange},

		{name: "divide", op: calculator.Divide, a: 10, b: 4, want: 2.5},
		{name: "divide zero by number", op: calculator.Divide, a: 0, b: 5, want: 0},
		{name: "divide by zero", op: calculator.Divide, a: 5, b: 0, wantErr: calculator.ErrDivisionByZero},
		{name: "divide zero by zero", op: calculator.Divide, a: 0, b: 0, wantErr: calculator.ErrDivisionByZero},
		{name: "divide overflow", op: calculator.Divide, a: 1e308, b: 1e-10, wantErr: calculator.ErrResultOutOfRange},

		{name: "power", op: calculator.Power, a: 2, b: 10, want: 1024},
		{name: "power negative exponent", op: calculator.Power, a: 2, b: -1, want: 0.5},
		{name: "power fractional exponent", op: calculator.Power, a: 9, b: 0.5, want: 3},
		{name: "power negative base odd exponent", op: calculator.Power, a: -2, b: 3, want: -8},
		{name: "power zero exponent", op: calculator.Power, a: 5, b: 0, want: 1},
		{name: "power zero to zero", op: calculator.Power, a: 0, b: 0, want: 1},
		{name: "power zero to negative", op: calculator.Power, a: 0, b: -1, wantErr: calculator.ErrDivisionByZero},
		{name: "power negative base fractional exponent", op: calculator.Power, a: -8, b: 1.0 / 3, wantErr: calculator.ErrInvalidDomain},
		{name: "power overflow", op: calculator.Power, a: 10, b: 400, wantErr: calculator.ErrResultOutOfRange},

		{name: "sqrt", op: calculator.Sqrt, a: 9, want: 3},
		{name: "sqrt zero", op: calculator.Sqrt, a: 0, want: 0},
		{name: "sqrt irrational", op: calculator.Sqrt, a: 2, want: math.Sqrt2},
		{name: "sqrt ignores b", op: calculator.Sqrt, a: 16, b: 123, want: 4},
		{name: "sqrt negative", op: calculator.Sqrt, a: -4, wantErr: calculator.ErrInvalidDomain},

		{name: "percent", op: calculator.Percent, a: 50, want: 0.5},
		{name: "percent negative", op: calculator.Percent, a: -25, want: -0.25},
		{name: "percent decimal", op: calculator.Percent, a: 0.5, want: 0.005},
		{name: "percent ignores b", op: calculator.Percent, a: 200, b: 7, want: 2},

		{name: "unknown operation", op: "modulo", a: 1, b: 2, wantErr: calculator.ErrUnknownOperation},
		{name: "empty operation", op: "", a: 1, b: 2, wantErr: calculator.ErrUnknownOperation},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calculator.Calculate(tt.op, tt.a, tt.b)

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("Calculate(%q, %v, %v) error = %v, want %v", tt.op, tt.a, tt.b, err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Calculate(%q, %v, %v) unexpected error: %v", tt.op, tt.a, tt.b, err)
			}
			if got != tt.want {
				t.Errorf("Calculate(%q, %v, %v) = %v, want %v", tt.op, tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestCalculateNormalizesNegativeZero(t *testing.T) {
	got, err := calculator.Calculate(calculator.Multiply, -1, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if math.Signbit(got) {
		t.Errorf("Calculate(multiply, -1, 0) = -0, want +0")
	}
}

func TestArity(t *testing.T) {
	tests := []struct {
		op     calculator.Operation
		want   int
		wantOK bool
	}{
		{op: calculator.Add, want: 2, wantOK: true},
		{op: calculator.Subtract, want: 2, wantOK: true},
		{op: calculator.Multiply, want: 2, wantOK: true},
		{op: calculator.Divide, want: 2, wantOK: true},
		{op: calculator.Power, want: 2, wantOK: true},
		{op: calculator.Sqrt, want: 1, wantOK: true},
		{op: calculator.Percent, want: 1, wantOK: true},
		{op: "modulo", want: 0, wantOK: false},
	}

	for _, tt := range tests {
		t.Run(string(tt.op), func(t *testing.T) {
			got, ok := calculator.Arity(tt.op)
			if got != tt.want || ok != tt.wantOK {
				t.Errorf("Arity(%q) = (%d, %v), want (%d, %v)", tt.op, got, ok, tt.want, tt.wantOK)
			}
		})
	}
}

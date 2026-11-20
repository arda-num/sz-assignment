import type { CalculateRequest, CalculateResponse, ErrorResponse } from './types'

const CALCULATE_URL = '/api/v1/calculate'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function calculate(request: CalculateRequest, signal?: AbortSignal): Promise<number> {
  let response: Response
  try {
    response = await fetch(CALCULATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }
    throw new ApiError(0, 'network_error', 'Could not reach the calculator service')
  }

  const body = await readJSON(response)

  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message)
    }
    throw unexpectedResponse(response.status)
  }

  if (!isCalculateResponse(body)) {
    throw unexpectedResponse(response.status)
  }
  return body.result
}

async function readJSON(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function unexpectedResponse(status: number): ApiError {
  return new ApiError(status, 'unexpected_response', 'Unexpected response from the server')
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCalculateResponse(body: unknown): body is CalculateResponse {
  return isObject(body) && typeof body.result === 'number'
}

function isErrorResponse(body: unknown): body is ErrorResponse {
  return (
    isObject(body) &&
    isObject(body.error) &&
    typeof body.error.code === 'string' &&
    typeof body.error.message === 'string'
  )
}

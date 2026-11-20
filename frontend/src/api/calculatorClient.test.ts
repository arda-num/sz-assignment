import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from './calculatorClient'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected promise to reject')
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('calculate', () => {
  it('posts a binary operation as JSON to the calculate endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 5 }))

    await calculate({ operation: 'add', a: 2, b: 3 })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/v1/calculate')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init?.body as string)).toEqual({ operation: 'add', a: 2, b: 3 })
  })

  it('sends unary operations without b', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 3 }))

    await calculate({ operation: 'sqrt', a: 9 })

    const init = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(init?.body as string)).toEqual({ operation: 'sqrt', a: 9 })
  })

  it('resolves with the result', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 2.5 }))

    await expect(calculate({ operation: 'divide', a: 10, b: 4 })).resolves.toBe(2.5)
  })

  it('forwards the abort signal to fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 1 }))
    const controller = new AbortController()

    await calculate({ operation: 'percent', a: 100 }, controller.signal)

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
  })

  it('throws an ApiError with the code and message from an error response', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'division_by_zero', message: 'division by zero' } }, 422),
    )

    const error = await catchError(calculate({ operation: 'divide', a: 1, b: 0 }))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'division_by_zero',
      message: 'division by zero',
    })
  })

  it('throws unexpected_response when an error response is not in the API format', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }))

    const error = await catchError(calculate({ operation: 'add', a: 1, b: 2 }))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, code: 'unexpected_response' })
  })

  it.each([
    ['missing result', {}],
    ['non-numeric result', { result: '5' }],
    ['null result', { result: null }],
  ])('throws unexpected_response for a success body with %s', async (_, body) => {
    fetchMock.mockResolvedValue(jsonResponse(body))

    const error = await catchError(calculate({ operation: 'add', a: 1, b: 2 }))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 200, code: 'unexpected_response' })
  })

  it('throws unexpected_response for a success body that is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))

    const error = await catchError(calculate({ operation: 'add', a: 1, b: 2 }))

    expect(error).toMatchObject({ code: 'unexpected_response' })
  })

  it('throws network_error when the request cannot be sent', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await catchError(calculate({ operation: 'add', a: 1, b: 2 }))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, code: 'network_error' })
  })

  it('rethrows aborts unchanged so callers can ignore them', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    fetchMock.mockRejectedValue(abort)

    const error = await catchError(calculate({ operation: 'add', a: 1, b: 2 }))

    expect(error).toBe(abort)
  })
})

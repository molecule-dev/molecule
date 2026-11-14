import { describe, expect, it } from 'vitest'

import { HttpError, serverErrorMessage } from '../index.js'
import type { FullRequestConfig, HttpResponse } from '../types.js'

const config: FullRequestConfig = { method: 'POST', url: '/api/users/u1' }
const failed = (status: number, data: unknown): HttpError => {
  const response: HttpResponse = { data, status, statusText: String(status), headers: {}, config }
  return new HttpError(`Request failed with status code ${status}`, status, response, config)
}

describe('serverErrorMessage', () => {
  it("returns the body's translated error, not the transport's status line", () => {
    expect(serverErrorMessage(failed(403, { error: 'Incorrect password.' }))).toBe(
      'Incorrect password.',
    )
  })

  it('falls back to the body message when there is no error string', () => {
    expect(serverErrorMessage(failed(400, { message: 'Invalid code' }))).toBe('Invalid code')
    expect(serverErrorMessage(failed(400, { error: 42, message: 'Invalid code' }))).toBe(
      'Invalid code',
    )
  })

  it('returns undefined when the server sent no message', () => {
    expect(serverErrorMessage(failed(500, {}))).toBeUndefined()
    expect(serverErrorMessage(failed(500, { error: '   ' }))).toBeUndefined()
    expect(serverErrorMessage(failed(502, '<html>Bad gateway</html>'))).toBeUndefined()
    expect(serverErrorMessage(new HttpError('Network Error', 0, undefined, config))).toBeUndefined()
  })

  it('never reads a thrown value that is not a request failure', () => {
    expect(serverErrorMessage(new Error('boom'))).toBeUndefined()
    expect(serverErrorMessage({ response: { data: { error: 'forged' } } })).toBeUndefined()
    expect(serverErrorMessage(undefined)).toBeUndefined()
  })
})

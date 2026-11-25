/**
 * The URL-encoded body parser over real HTTP: what it does with a field over its size limit, a
 * body it cannot read, and a client that hangs up.
 *
 * Upload security review (2026-11-25), the two items "noticed in passing": a field over the limit
 * was passed on cut short with a 200, and a client that hung up was logged as a server error.
 */
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { connect } from 'node:net'

import express from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue,
}))

import { provider } from '../provider.js'

/** The per-field limit of the URL-encoded parser, from `FORM_LIMITS`. */
const FIELD_LIMIT = 1024 * 1024

const servers: Array<{ close: () => void }> = []
afterEach(() => {
  for (const server of servers.splice(0)) server.close()
  vi.clearAllMocks()
})

/** A running app whose `/form` route answers with the length of each field it received. */
async function formApp(): Promise<string> {
  const server = express()
  server.use(provider as express.RequestHandler)
  server.post('/form', (req, res) => {
    const lengths = Object.fromEntries(
      Object.entries(req.body as Record<string, unknown>).map(([key, value]) => [
        key,
        String(value).length,
      ]),
    )
    res.json(lengths)
  })
  const listening = server.listen(0, '127.0.0.1')
  await once(listening, 'listening')
  servers.push(listening)
  const { port } = listening.address() as AddressInfo
  return `http://127.0.0.1:${port}/form`
}

/** Posts `body` as a URL-encoded form. `URLSearchParams` names the type itself; a raw string needs it. */
const post = (url: string, body: URLSearchParams | string): Promise<Response> =>
  fetch(url, {
    method: 'POST',
    body,
    ...(typeof body === 'string' && {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  })

describe('a URL-encoded body', () => {
  it('refuses a field over the size limit with 413, and passes on one of exactly the limit whole (OLD MUSTFAIL)', async () => {
    const url = await formApp()
    const atLimit = await post(url, new URLSearchParams({ note: 'x'.repeat(FIELD_LIMIT) }))
    expect(atLimit.status).toBe(200)
    expect(await atLimit.json()).toEqual({ note: FIELD_LIMIT })

    const over = await post(url, new URLSearchParams({ note: 'x'.repeat(FIELD_LIMIT + 1) }))
    expect(over.status).toBe(413)
    expect(await over.json()).toEqual({
      error: 'The request is too large.',
      errorKey: 'middleware.error.payloadTooLarge',
    })
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('refuses a field whose name is cut short with 413, instead of renaming it (OLD MUSTFAIL)', async () => {
    const url = await formApp()
    // busboy keeps 100 bytes of a field's name and reports the cut.
    const res = await post(url, new URLSearchParams({ ['n'.repeat(101)]: 'value' }))
    expect(res.status).toBe(413)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.payloadTooLarge' })
  })

  // Counterexample: fields each under the per-field limit are still capped together.
  it('still refuses a body past the total cap of 2 MiB with 413', async () => {
    const url = await formApp()
    const third = 800 * 1024 // three such fields are 2.4 MiB together, none over the field limit
    const res = await post(
      url,
      new URLSearchParams({
        first: 'x'.repeat(third),
        second: 'y'.repeat(third),
        third: 'z'.repeat(third),
      }),
    )
    expect(res.status).toBe(413)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.payloadTooLarge' })
  })

  // The same cut short, by count: busboy drops every field past the field limit of 100 without a word.
  it('refuses a form with more fields than the limit with 413, instead of passing on the first 100 (OLD MUSTFAIL)', async () => {
    const url = await formApp()
    const fields = (count: number): URLSearchParams =>
      new URLSearchParams(Array.from({ length: count }, (_, i) => [`field${i}`, String(i)]))
    const atLimit = await post(url, fields(100))
    expect(atLimit.status).toBe(200)
    expect(Object.keys(await atLimit.json())).toHaveLength(100)

    const over = await post(url, fields(101))
    expect(over.status).toBe(413)
    expect(await over.json()).toEqual({
      error: 'The request is too large.',
      errorKey: 'middleware.error.payloadTooLarge',
    })
    // A form of exactly the limit is whole, trailing ampersand or not.
    const ampersand = await post(
      url,
      Array.from({ length: 100 }, (_, i) => `field${i}=${i}`).join('&') + '&',
    )
    expect(ampersand.status).toBe(200)
    expect(Object.keys(await ampersand.json())).toHaveLength(100)
  })

  it('answers 400 for a body it cannot read, without logging a server error (OLD MUSTFAIL)', async () => {
    const url = await formApp()
    const res = await post(url, 'note=%zz')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'Bad request.',
      errorKey: 'middleware.error.badRequest',
    })
    expect(mockLogger.error).not.toHaveBeenCalled()
    expect(mockLogger.debug).toHaveBeenCalledTimes(1)
    const [message, details] = mockLogger.debug.mock.calls[0] as [string, Record<string, unknown>]
    expect(message).toMatch(/URL-encoded body/)
    expect(details).toMatchObject({ status: 400, error: expect.any(Error) })
  })

  it('logs a client that hangs up mid-body at debug, not as a server error (OLD MUSTFAIL)', async () => {
    const url = await formApp()
    const { port } = new URL(url)
    const socket = connect(Number(port), '127.0.0.1')
    await once(socket, 'connect')
    socket.write(
      [
        'POST /form HTTP/1.1',
        `Host: 127.0.0.1:${port}`,
        'Content-Type: application/x-www-form-urlencoded',
        'Content-Length: 100000',
        '',
        `note=${'x'.repeat(2000)}`,
      ].join('\r\n'),
    )
    // The server has the first bytes of the body and is waiting for the rest.
    await new Promise((resolve) => setTimeout(resolve, 100))
    socket.destroy()
    // The parser notices, and says so once: at debug, never as a server error.
    await vi.waitFor(() =>
      expect(mockLogger.debug.mock.calls.length + mockLogger.error.mock.calls.length).toBe(1),
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
    const [message, details] = mockLogger.debug.mock.calls[0] as [string, Record<string, unknown>]
    expect(message).toMatch(/the client (closed|went away)/)
    expect(details).toMatchObject({ error: expect.any(Error) })
    // The server still answers the next request.
    const next = await post(url, new URLSearchParams({ note: 'still here' }))
    expect(next.status).toBe(200)
    expect(await next.json()).toEqual({ note: 10 })
  })
})

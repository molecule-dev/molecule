import { describe, expect, it } from 'vitest'

import { HttpError, snapshotHttpErrorBody, snapshotHttpErrorResponse } from '../index.js'
import type { HttpResponse } from '../types.js'

const response = (data: unknown): HttpResponse => ({
  data,
  status: 422,
  statusText: 'Unprocessable Content',
  headers: { 'x-request-id': 'safe' },
  config: { method: 'POST', url: '/safe' },
})

describe('round-nine HTTP body and response capture', () => {
  it('retains safe SharedArrayBuffer bytes in a detached shared buffer', async () => {
    const input = new SharedArrayBuffer(4)
    new Uint8Array(input).set([65, 66, 67, 68])

    const body = await snapshotHttpErrorBody(input)
    const retained = new HttpError('failed', 422, response(input)).response!.data

    expect(body).toBeInstanceOf(SharedArrayBuffer)
    expect(body).not.toBe(input)
    expect(Array.from(new Uint8Array(body))).toEqual([65, 66, 67, 68])
    expect(retained).toBeInstanceOf(SharedArrayBuffer)
    expect(Array.from(new Uint8Array(retained as SharedArrayBuffer))).toEqual([65, 66, 67, 68])
  })

  it('scrubs SharedArrayBuffer text in sync and async captures', async () => {
    const bytes = new TextEncoder().encode('password=shared-buffer-credential')
    const input = new SharedArrayBuffer(bytes.length)
    new Uint8Array(input).set(bytes)

    const asyncBody = await snapshotHttpErrorBody(input)
    const syncBody = new HttpError('failed', 422, response(input)).response!.data

    expect(new TextDecoder().decode(new Uint8Array(asyncBody))).toBe('password=[REDACTED]')
    expect(new TextDecoder().decode(new Uint8Array(syncBody as SharedArrayBuffer))).toBe(
      'password=[REDACTED]',
    )
  })

  it('keeps HttpError metadata when the body buffer is detached', () => {
    const body = new ArrayBuffer(4)
    structuredClone(body, { transfer: [body] })

    const retained = new HttpError('failed', 422, response(body))

    expect(retained).toBeInstanceOf(HttpError)
    expect(retained.status).toBe(422)
    expect(retained.response!.status).toBe(422)
  })

  it('retains readable non-enumerable response fields', async () => {
    const original = response({ safe: 'body' })
    Object.defineProperty(original, 'data', { value: { safe: 'body' }, enumerable: false })

    const retained = await snapshotHttpErrorResponse(original)

    expect(retained.data).toEqual({ safe: 'body' })
    expect(retained.status).toBe(422)
    expect(retained.config).toEqual({ method: 'POST', url: '/safe' })
  })
})

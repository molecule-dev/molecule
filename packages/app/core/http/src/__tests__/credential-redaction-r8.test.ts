import { describe, expect, it } from 'vitest'

import { HttpError, snapshotHttpErrorBody } from '../index.js'
import type { HttpResponse } from '../types.js'

const response = (data: unknown): HttpResponse => ({
  data,
  status: 422,
  statusText: 'Unprocessable Content',
  headers: { 'x-request-id': 'safe' },
  config: { method: 'POST', url: '/safe' },
})

describe('round-eight body-preserving HTTP capture', () => {
  it('uses a defined byte view when scrubbing changes wide-view alignment', () => {
    const bytes = new TextEncoder().encode('password=abc')
    const input = new Uint16Array(bytes.buffer)

    const error = new HttpError('failed', 422, response(input))
    const retained = error.response!.data

    expect(retained).toBeInstanceOf(Uint8Array)
    expect(new TextDecoder().decode(retained as Uint8Array)).toBe('password=[REDACTED]')
  })

  it('clones unchanged Blob bytes directly, including a UTF-8 BOM', async () => {
    const bytes = new Uint8Array([239, 187, 191, ...new TextEncoder().encode('safe body')])
    const input = new Blob([bytes], { type: 'text/plain' })

    const body = await snapshotHttpErrorBody(input)

    expect(body).toBeInstanceOf(Blob)
    expect(body).not.toBe(input)
    expect(body.type).toBe(input.type)
    expect(new Uint8Array(await body.arrayBuffer())).toEqual(bytes)
  })

  it('retains the BOM when changed Blob text is rebuilt', async () => {
    const bytes = new Uint8Array([239, 187, 191, ...new TextEncoder().encode('password=abc')])

    const body = await snapshotHttpErrorBody(new Blob([bytes], { type: 'text/plain' }))
    const retained = new Uint8Array(await body.arrayBuffer())

    expect(Array.from(retained.slice(0, 3))).toEqual([239, 187, 191])
    expect(new TextDecoder().decode(retained)).toBe('password=[REDACTED]')
  })

  it('keeps the exact unchanged typed-array clone path', () => {
    const input = new Uint16Array([0x1234, 0xabcd])
    const error = new HttpError('failed', 422, response(input))
    const retained = error.response!.data as Uint16Array

    expect(retained).toBeInstanceOf(Uint16Array)
    expect(retained).not.toBe(input)
    expect(Array.from(retained)).toEqual(Array.from(input))
  })
})

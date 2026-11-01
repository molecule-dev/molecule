import { describe, expect, it } from 'vitest'

import { HttpError } from '../index.js'
import type { HttpResponse } from '../types.js'

const response = (data: unknown): HttpResponse => ({
  data,
  status: 422,
  statusText: 'Unprocessable Content',
  headers: { 'x-request-id': 'safe-id' },
  config: { method: 'POST', url: '/safe' },
})

describe('round-seven retained HTTP metadata and binary bodies', () => {
  it('preserves non-text Uint16Array body bytes and view length', () => {
    const input = new Uint16Array([0xffff, 0xfffd])
    const error = new HttpError('failed', 422, response(input))
    const retained = error.response!.data as Uint16Array
    expect(retained).toBeInstanceOf(Uint16Array)
    expect(retained).not.toBe(input)
    expect(Array.from(retained)).toEqual(Array.from(input))
  })

  it('can retain non-text BigInt typed array bodies without throwing', () => {
    const input = new BigUint64Array([0xffffffffffffffffn])
    expect(() => new HttpError('failed', 422, response(input))).not.toThrow()
  })

  it('does not retain the live minimal HttpError request config', () => {
    const config = { method: 'GET' as const, url: '/safe' }
    const error = new HttpError('failed', 422, { ...response({ safe: 'same' }), config }, config)
    config.url = '/auth?token=config-mutation-secret'
    expect(JSON.stringify(error)).not.toContain('config-mutation-secret')
  })

  it('preserves unchanged UTF-8 BOM bytes in an ArrayBuffer response', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('{"safe":"same"}')])
    const error = new HttpError('failed', 422, response(bytes.buffer))
    expect(new Uint8Array(error.response!.data as ArrayBuffer)).toEqual(bytes)
  })
})

import { describe, expect, it, vi } from 'vitest'

import type { Middleware } from '../parser.js'
import {
  createUploadParser,
  getParsedUploads,
  setParsedUploads,
  setUploadParserFactory,
  type UploadParserFactory,
} from '../upload-parser.js'

const storage = (): never => {
  throw new Error('not used')
}

describe('createUploadParser', () => {
  it('passes an error to next when no factory is bonded, instead of hanging', async () => {
    vi.resetModules()
    const fresh = await import('../upload-parser.js')
    const next = vi.fn()
    fresh.createUploadParser({ field: 'f', maxFileBytes: 1, storage })({}, {}, next)
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(String(next.mock.calls[0][0])).toContain('setUploadParserFactory')
  })

  it('looks the factory up on the first request, so a router can be built before wiring', () => {
    const parser = createUploadParser({ field: 'photo', maxFileBytes: 10, storage })
    const inner: Middleware = vi.fn((_req, _res, next) => next())
    const factory = vi.fn(() => inner) as unknown as UploadParserFactory
    setUploadParserFactory(factory)
    const next = vi.fn()
    parser({}, {}, next)
    parser({}, {}, next)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(vi.mocked(factory).mock.calls[0][0]).toMatchObject({ field: 'photo', maxFileBytes: 10 })
    expect(inner).toHaveBeenCalledTimes(2)
    expect(next).toHaveBeenCalledTimes(2)
  })
})

describe('parsed uploads', () => {
  it('are kept per field on the request', () => {
    const req = {}
    setParsedUploads(req, 'a', [{ id: '1' }])
    setParsedUploads(req, 'b', [{ id: '2' }, { id: '3' }])
    expect(getParsedUploads(req, 'b').map((f) => f.id)).toEqual(['2', '3'])
    expect(getParsedUploads(req).map((f) => f.id)).toEqual(['1', '2', '3'])
    expect(getParsedUploads(req, 'c')).toEqual([])
    expect(getParsedUploads(null)).toEqual([])
  })
})

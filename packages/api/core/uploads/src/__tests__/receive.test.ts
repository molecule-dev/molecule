import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, unbond } from '@molecule/api-bond'
import {
  setParsedUploads,
  setUploadParserFactory,
  type UploadParserFactory,
  type UploadParserOptions,
} from '@molecule/api-middleware-body-parser'

import { blockedTypeRefusal } from '../errors.js'
import { setProvider } from '../provider.js'
import {
  discardUploads,
  getUploads,
  receiveUploads,
  type ReceiveUploadsOptions,
} from '../receive.js'
import type { UploadedFile, UploadProvider } from '../types.js'

const file = (id: string, fieldname = 'photo'): UploadedFile => ({
  id,
  fieldname,
  filename: `${id}.png`,
  encoding: '7bit',
  mimetype: 'image/png',
  size: 10,
  uploaded: true,
})

describe('receiveUploads', () => {
  let provider: UploadProvider
  let received: UploadParserOptions<UploadedFile> | undefined

  beforeEach(() => {
    provider = { upload: vi.fn(), abortUpload: vi.fn(), deleteFile: vi.fn(async () => {}) }
    setProvider(provider)
    received = undefined
    const factory: UploadParserFactory = (options) => {
      received = options as unknown as UploadParserOptions<UploadedFile>
      return (_req, _res, next) => next()
    }
    setUploadParserFactory(factory)
  })

  it('stores into the bonded upload provider with the route options', () => {
    const next = vi.fn()
    receiveUploads({ field: 'photo', maxFileBytes: 1024, types: ['image/*'] })({}, {}, next)
    expect(next).toHaveBeenCalledWith()
    expect(received).toMatchObject({ field: 'photo', maxFileBytes: 1024, types: ['image/*'] })
    const storage = received!.storage()
    const info = { filename: 'a.png', encoding: '7bit', mimeType: 'image/png' }
    storage.upload('photo', new PassThrough(), info, vi.fn())
    expect(provider.upload).toHaveBeenCalledWith(
      'photo',
      expect.anything(),
      info,
      expect.any(Function),
    )
    void storage.abortUpload(file('a'))
    expect(provider.abortUpload).toHaveBeenCalledWith(file('a'))
    void storage.deleteFile('a')
    expect(provider.deleteFile).toHaveBeenCalledWith('a')
  })

  it('tells the provider a route stores the types a browser runs, and only that route', () => {
    receiveUploads({ field: 'file', allowActiveTypes: true })({}, {}, vi.fn())
    expect(received).not.toHaveProperty('allowActiveTypes')
    const info = { filename: 'a.html', encoding: '7bit', mimeType: 'text/html' }
    received!.storage().upload('file', new PassThrough(), info, vi.fn())
    expect(provider.upload).toHaveBeenLastCalledWith(
      'file',
      expect.anything(),
      { ...info, allowActiveTypes: true },
      expect.any(Function),
    )
    receiveUploads({ field: 'file' })({}, {}, vi.fn())
    received!.storage().upload('file', new PassThrough(), info, vi.fn())
    expect(provider.upload).toHaveBeenLastCalledWith(
      'file',
      expect.anything(),
      info,
      expect.any(Function),
    )
  })

  describe('a file refused for its type', () => {
    const warn = vi.fn()
    beforeEach(() => {
      bond('logger', { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() })
    })
    afterEach(() => {
      unbond('logger')
      warn.mockReset()
    })

    it('reaches the parser, and the server log names the option that stores it', () => {
      const refusal = blockedTypeRefusal({ mimeType: 'image/svg+xml' })!
      vi.mocked(provider.upload).mockImplementation((_field, _stream, _info, onError) => {
        onError(refusal)
        return file('x')
      })
      receiveUploads({ field: 'file' })({}, {}, vi.fn())
      const onError = vi.fn()
      received!
        .storage()
        .upload(
          'file',
          new PassThrough(),
          { filename: 'a.svg', encoding: '7bit', mimeType: 'image/svg+xml' },
          onError,
        )
      expect(onError).toHaveBeenCalledWith(refusal)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain('allowActiveTypes')
      expect(warn.mock.calls[0][1]).toEqual({ type: 'image/svg+xml' })
    })

    // Counterexample: a storage failure is passed on as it is, with no note about types.
    it('passes any other storage error on without the note', () => {
      const failure = new Error('disk full')
      vi.mocked(provider.upload).mockImplementation((_field, _stream, _info, onError) => {
        onError(failure)
        return file('x')
      })
      receiveUploads({ field: 'file' })({}, {}, vi.fn())
      const onError = vi.fn()
      received!
        .storage()
        .upload(
          'file',
          new PassThrough(),
          { filename: 'a', encoding: '7bit', mimeType: 'image/png' },
          onError,
        )
      expect(onError).toHaveBeenCalledWith(failure)
      expect(warn).not.toHaveBeenCalled()
    })

    /** Makes the bonded provider refuse every file it is given: an SVG, a type a browser runs. */
    const refuseEveryFile = (): void => {
      const refusal = blockedTypeRefusal({ mimeType: 'image/svg+xml' })!
      vi.mocked(provider.upload).mockImplementation((_field, _stream, _info, onError) => {
        onError(refusal)
        return file('x')
      })
    }

    // Upload security review (2026-11-25), finding 8: the hint went to the log at `warn` for every
    // refused upload, so any client could write it as often as it liked.
    it('logs the hint once per route, however many files are refused (OLD MUSTFAIL)', () => {
      refuseEveryFile()
      const refuseTwice = (options: ReceiveUploadsOptions): void => {
        const middleware = receiveUploads(options)
        middleware({}, {}, vi.fn())
        for (let i = 0; i < 2; i++)
          received!
            .storage()
            .upload(
              options.field,
              new PassThrough(),
              { filename: 'a.svg', encoding: '7bit', mimeType: 'image/svg+xml' },
              vi.fn(),
            )
      }
      const route = { field: 'avatar' }
      refuseTwice(route)
      expect(warn).toHaveBeenCalledTimes(1)
      // The same route options are not told again, nor is a second middleware built from them.
      refuseTwice(route)
      expect(warn).toHaveBeenCalledTimes(1)
      refuseTwice({ field: 'cover' })
      expect(warn).toHaveBeenCalledTimes(2)
      expect(warn.mock.calls.every(([message]) => message.includes('allowActiveTypes'))).toBe(true)
    })

    // Finding 8: the hint told the developer to turn the option on, which is wrong for a route that
    // shows its files (an avatar).
    it('says the option is only for a route that serves downloads, never for one that shows files', () => {
      refuseEveryFile()
      receiveUploads({ field: 'avatar' })({}, {}, vi.fn())
      received!
        .storage()
        .upload(
          'avatar',
          new PassThrough(),
          { filename: 'a.svg', encoding: '7bit', mimeType: 'image/svg+xml' },
          vi.fn(),
        )
      const [message] = warn.mock.calls[0] as [string]
      expect(message).toMatch(
        /only on a route that serves its files as downloads through sendUpload\(\)/,
      )
      expect(message).toMatch(/never on one that shows them to users/)
    })
  })

  it('refuses, when the router loads, types that name one a browser runs without the option', () => {
    expect(() =>
      receiveUploads({ field: 'avatar', types: ['image/png', 'image/svg+xml'] }),
    ).toThrow(/image\/svg\+xml[\s\S]*allowActiveTypes: true/)
    expect(() =>
      receiveUploads({ field: 'avatar', types: ['image/svg+xml'], allowActiveTypes: true }),
    ).not.toThrow()
    // Counterexample: a whole family names no blocked type; an SVG in it is still refused by the provider.
    expect(() => receiveUploads({ field: 'avatar', types: ['image/*'] })).not.toThrow()
  })

  // Upload security review (2026-11-25), finding 3: a listed `+xml` or script type the list did not
  // name loaded without a word, and every upload to the route was then refused at upload time.
  it('refuses, when the router loads, a listed type the rule catches and the list does not name (OLD MUSTFAIL)', () => {
    for (const type of ['application/atom+xml', 'text/jscript', 'text/ecmascript']) {
      expect(() => receiveUploads({ field: 'feed', types: ['image/png', type] }), type).toThrow(
        new RegExp(`${type.replace(/[+*?()]/g, '\\$&')}[\\s\\S]*allowActiveTypes: true`),
      )
      expect(
        () => receiveUploads({ field: 'feed', types: [type], allowActiveTypes: true }),
        type,
      ).not.toThrow()
    }
    // Counterexample: an ordinary type loads, and a route that allows the types loads with them.
    expect(() =>
      receiveUploads({ field: 'feed', types: ['application/zip', 'text/plain'] }),
    ).not.toThrow()
  })

  it('builds nothing until the first request, so a router module imports without the bonds', () => {
    const middleware = receiveUploads({ field: 'photo', maxFileBytes: 1 })
    expect(received).toBeUndefined()
    middleware({}, {}, vi.fn())
    expect(received).toMatchObject({ field: 'photo' })
  })

  it('reads the stored files back, per field or all of them', () => {
    const req = {}
    setParsedUploads(req, 'photo', [file('a'), file('b')])
    setParsedUploads(req, 'doc', [file('c', 'doc')])
    expect(getUploads(req, 'photo').map((f) => f.id)).toEqual(['a', 'b'])
    expect(getUploads(req).map((f) => f.id)).toEqual(['a', 'b', 'c'])
    expect(getUploads({}, 'photo')).toEqual([])
  })

  it('discards every stored file, and a failed removal does not stop the others', async () => {
    const req = {}
    setParsedUploads(req, 'photo', [file('a'), file('b')])
    vi.mocked(provider.deleteFile).mockRejectedValueOnce(new Error('gone'))
    await discardUploads(req)
    expect(provider.deleteFile).toHaveBeenCalledWith('a')
    expect(provider.deleteFile).toHaveBeenCalledWith('b')
  })

  // Upload security review (2026-11-25), finding 2: the upload parser removes a request's files
  // itself when the route fails after the upload, and it asks the request which files it still has.
  // A file the handler already removed through discardUploads() must be off that list, or the
  // parser removes it again (a second ENOENT on the filesystem bond, logged as a failure).
  it('forgets the files it removed, so nothing removes them twice; one it could not remove stays (OLD MUSTFAIL)', async () => {
    const req = {}
    setParsedUploads(req, 'photo', [file('a'), file('b')])
    setParsedUploads(req, 'doc', [file('c', 'doc')])
    vi.mocked(provider.deleteFile).mockRejectedValueOnce(new Error('gone'))
    await discardUploads(req)
    expect(getUploads(req).map((f) => f.id)).toEqual(['a'])
    expect(getUploads(req, 'doc')).toEqual([])

    // A second discard only retries what is still there.
    vi.mocked(provider.deleteFile).mockClear()
    await discardUploads(req)
    expect(provider.deleteFile).toHaveBeenCalledTimes(1)
    expect(provider.deleteFile).toHaveBeenCalledWith('a')
    expect(getUploads(req)).toEqual([])
  })
})

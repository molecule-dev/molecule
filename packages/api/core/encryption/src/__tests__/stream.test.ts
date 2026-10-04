import { Transform } from 'node:stream'

import { describe, expect, it, vi } from 'vitest'

import {
  ENCRYPTED_STREAM_FORMAT,
  EncryptionStreamError,
  type EncryptionStreamErrorCode,
  hasStreamEncryption,
  isEncryptionStreamError,
} from '../stream.js'
import type { EncryptionProvider } from '../types.js'

const base = (): EncryptionProvider => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  hash: vi.fn(),
  verify: vi.fn(),
  rotateKey: vi.fn(),
})

describe('stream encryption contract', () => {
  it('names the framing', () => {
    expect(ENCRYPTED_STREAM_FORMAT).toBe('mol-aead-chunked-v2')
  })

  it('EncryptionStreamError carries its name, code and cause', () => {
    const cause = new Error('inner')
    const err = new EncryptionStreamError('auth', 'bad stream', { cause })
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('EncryptionStreamError')
    expect(err.code).toBe('auth')
    expect(err.message).toBe('bad stream')
    expect(err.cause).toBe(cause)
  })

  it('isEncryptionStreamError recognizes every code', () => {
    const codes: EncryptionStreamErrorCode[] = [
      'bad-header',
      'unknown-key-version',
      'unknown-key',
      'auth',
      'truncated',
      'overflow',
      'internal',
    ]
    for (const code of codes) {
      expect(isEncryptionStreamError(new EncryptionStreamError(code, code))).toBe(true)
    }
  })

  it('isEncryptionStreamError recognizes a copy from another package instance by name + code', () => {
    const foreign = Object.assign(new Error('x'), {
      name: 'EncryptionStreamError',
      code: 'truncated',
    })
    expect(isEncryptionStreamError(foreign)).toBe(true)
  })

  it('isEncryptionStreamError rejects other errors and unknown codes', () => {
    expect(isEncryptionStreamError(new Error('x'))).toBe(false)
    expect(isEncryptionStreamError('EncryptionStreamError')).toBe(false)
    expect(isEncryptionStreamError(null)).toBe(false)
    const noCode = Object.assign(new Error('x'), { name: 'EncryptionStreamError' })
    expect(isEncryptionStreamError(noCode)).toBe(false)
    const badCode = Object.assign(new Error('x'), { name: 'EncryptionStreamError', code: 'nope' })
    expect(isEncryptionStreamError(badCode)).toBe(false)
  })

  it('hasStreamEncryption is false without the stream methods', () => {
    expect(hasStreamEncryption(base())).toBe(false)
  })

  it('hasStreamEncryption is false with only one of the two', () => {
    expect(hasStreamEncryption({ ...base(), encryptStream: () => new Transform() })).toBe(false)
    expect(hasStreamEncryption({ ...base(), decryptStream: () => new Transform() })).toBe(false)
  })

  it('hasStreamEncryption is true with both', () => {
    const provider: EncryptionProvider = {
      ...base(),
      encryptStream: () => new Transform(),
      decryptStream: () => new Transform(),
    }
    expect(hasStreamEncryption(provider)).toBe(true)
    if (hasStreamEncryption(provider)) {
      // narrowed: callable without optional chaining
      expect(provider.encryptStream()).toBeInstanceOf(Transform)
    }
  })
})

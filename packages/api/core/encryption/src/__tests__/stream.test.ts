import { Transform } from 'node:stream'

import { describe, expect, it, vi } from 'vitest'

import { ENCRYPTED_STREAM_FORMAT, EncryptionStreamError, hasStreamEncryption } from '../stream.js'
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
    expect(ENCRYPTED_STREAM_FORMAT).toBe('mol-aead-chunked-v1')
  })

  it('EncryptionStreamError carries its name and cause', () => {
    const cause = new Error('inner')
    const err = new EncryptionStreamError('bad stream', { cause })
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('EncryptionStreamError')
    expect(err.message).toBe('bad stream')
    expect(err.cause).toBe(cause)
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

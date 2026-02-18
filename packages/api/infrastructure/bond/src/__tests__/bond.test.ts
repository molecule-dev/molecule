import { beforeEach, describe, expect, it } from 'vitest'

import { bond, get, getAll, isBonded, require as requireBond, unbond, unbondAll } from '../bond.js'
import { configure, reset } from '../registry.js'

// Mock providers
const mockLogger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

const mockEmailProvider = {
  sendMail: async () => ({
    accepted: ['test@example.com'],
    rejected: [],
    messageId: 'test-id',
    response: 'OK',
  }),
}

const mockOAuthProvider = {
  serverName: 'github',
  verify: async () => ({
    username: 'testuser',
    email: 'test@example.com',
    oauthServer: 'github',
    oauthId: '123',
    oauthData: {},
  }),
}

const mockUploadProvider = {
  upload: () => ({
    id: '1',
    fieldname: 'file',
    filename: 'file.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 100,
    url: 'https://example.com/file.png',
    key: 'file.png',
  }),
  abortUpload: async () => {},
  deleteFile: async () => {},
  getFile: async () => null,
}

const mockPaymentProvider = {
  providerName: 'stripe',
}

describe('bond()', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('should bond a singleton provider', () => {
    bond('logger', mockLogger)
    expect(get('logger')).toBe(mockLogger)
  })

  it('should bond an email provider', () => {
    bond('email', mockEmailProvider)
    expect(get('email')).toBe(mockEmailProvider)
  })

  it('should bond a named provider', () => {
    bond('oauth', 'github', mockOAuthProvider)
    expect(get('oauth', 'github')).toBe(mockOAuthProvider)
  })

  it('should support multiple named providers', () => {
    const googleProvider = { ...mockOAuthProvider, serverName: 'google' }
    bond('oauth', 'github', mockOAuthProvider)
    bond('oauth', 'google', googleProvider)
    expect(get('oauth', 'github')).toBe(mockOAuthProvider)
    expect(get('oauth', 'google')).toBe(googleProvider)
  })

  it('should bond an upload provider as singleton', () => {
    bond('uploads', mockUploadProvider)
    expect(get('uploads')).toBe(mockUploadProvider)
  })

  it('should bond a payment provider by name', () => {
    bond('payments', 'stripe', mockPaymentProvider)
    expect(get('payments', 'stripe')).toBe(mockPaymentProvider)
  })

  it('should support multiple payment providers', () => {
    const appleProvider = { ...mockPaymentProvider, providerName: 'apple' }
    bond('payments', 'stripe', mockPaymentProvider)
    bond('payments', 'apple', appleProvider)
    expect(get('payments', 'stripe')).toBe(mockPaymentProvider)
    expect(get('payments', 'apple')).toBe(appleProvider)
  })

  it('should bond any custom singleton', () => {
    const cacheProvider = { get: () => null, set: () => {} }
    bond('cache', cacheProvider)
    expect(get('cache')).toBe(cacheProvider)
  })

  it('should bond any custom named provider', () => {
    const ordersQueue = { send: () => {}, receive: () => null }
    bond('queue', 'orders', ordersQueue)
    expect(get('queue', 'orders')).toBe(ordersQueue)
  })
})

describe('get()', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('should return undefined for unbound singleton', () => {
    expect(get('logger')).toBeUndefined()
  })

  it('should return bonded singleton', () => {
    bond('logger', mockLogger)
    expect(get('logger')).toBe(mockLogger)
  })

  it('should return undefined for unbound named', () => {
    expect(get('oauth', 'github')).toBeUndefined()
  })

  it('should return bonded named provider', () => {
    bond('oauth', 'github', mockOAuthProvider)
    expect(get('oauth', 'github')).toBe(mockOAuthProvider)
  })
})

describe('getAll()', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('should return empty map when none bonded', () => {
    expect(getAll('oauth').size).toBe(0)
  })

  it('should return all bonded named providers', () => {
    const googleProvider = { ...mockOAuthProvider, serverName: 'google' }
    bond('oauth', 'github', mockOAuthProvider)
    bond('oauth', 'google', googleProvider)
    const all = getAll('oauth')
    expect(all.size).toBe(2)
    expect(all.get('github')).toBe(mockOAuthProvider)
    expect(all.get('google')).toBe(googleProvider)
  })

  it('should return all payment providers', () => {
    const appleProvider = { ...mockPaymentProvider, providerName: 'apple' }
    bond('payments', 'stripe', mockPaymentProvider)
    bond('payments', 'apple', appleProvider)
    const all = getAll('payments')
    expect(all.size).toBe(2)
    expect(all.get('stripe')).toBe(mockPaymentProvider)
    expect(all.get('apple')).toBe(appleProvider)
  })
})

describe('require()', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('should throw when singleton not bonded', () => {
    expect(() => requireBond('logger')).toThrow("No 'logger' provider bonded")
  })

  it('should return bonded singleton', () => {
    bond('logger', mockLogger)
    expect(requireBond('logger')).toBe(mockLogger)
  })

  it('should throw when named not bonded', () => {
    expect(() => requireBond('oauth', 'github')).toThrow("No 'oauth:github' provider bonded")
  })

  it('should return bonded named provider', () => {
    bond('oauth', 'github', mockOAuthProvider)
    expect(requireBond('oauth', 'github')).toBe(mockOAuthProvider)
  })

  it('should throw for unbound uploads', () => {
    expect(() => requireBond('uploads')).toThrow("No 'uploads' provider bonded")
  })

  it('should return bonded uploads', () => {
    bond('uploads', mockUploadProvider)
    expect(requireBond('uploads')).toBe(mockUploadProvider)
  })

  it('should throw for unbound payment', () => {
    expect(() => requireBond('payments', 'stripe')).toThrow("No 'payments:stripe' provider bonded")
  })

  it('should return bonded payment provider', () => {
    bond('payments', 'stripe', mockPaymentProvider)
    expect(requireBond('payments', 'stripe')).toBe(mockPaymentProvider)
  })

  it('should throw for unbound custom singleton', () => {
    expect(() => requireBond('cache')).toThrow("No 'cache' provider bonded")
  })

  it('should throw for unbound custom named', () => {
    expect(() => requireBond('queue', 'orders')).toThrow("No 'queue:orders' provider bonded")
  })

  it('should return bonded custom singleton', () => {
    const cacheProvider = { get: () => null }
    bond('cache', cacheProvider)
    expect(requireBond('cache')).toBe(cacheProvider)
  })

  it('should return bonded custom named', () => {
    const ordersQueue = { send: () => {} }
    bond('queue', 'orders', ordersQueue)
    expect(requireBond('queue', 'orders')).toBe(ordersQueue)
  })
})

describe('unbond()', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('should return false when singleton not bonded', () => {
    expect(unbond('logger')).toBe(false)
  })

  it('should unbond singleton and return true', () => {
    bond('logger', mockLogger)
    expect(unbond('logger')).toBe(true)
    expect(get('logger')).toBeUndefined()
  })

  it('should unbond email and return true', () => {
    bond('email', mockEmailProvider)
    expect(unbond('email')).toBe(true)
    expect(get('email')).toBeUndefined()
  })

  it('should return false for unbound named', () => {
    expect(unbond('oauth', 'github')).toBe(false)
  })

  it('should unbond named and return true', () => {
    bond('oauth', 'github', mockOAuthProvider)
    expect(unbond('oauth', 'github')).toBe(true)
    expect(get('oauth', 'github')).toBeUndefined()
  })

  it('should unbond uploads and return true', () => {
    bond('uploads', mockUploadProvider)
    expect(unbond('uploads')).toBe(true)
    expect(get('uploads')).toBeUndefined()
  })

  it('should return false for unbound payment', () => {
    expect(unbond('payments', 'stripe')).toBe(false)
  })

  it('should unbond payment and return true', () => {
    bond('payments', 'stripe', mockPaymentProvider)
    expect(unbond('payments', 'stripe')).toBe(true)
    expect(get('payments', 'stripe')).toBeUndefined()
  })

  it('should return false for unbound custom singleton', () => {
    expect(unbond('cache')).toBe(false)
  })

  it('should unbond custom singleton', () => {
    const cacheProvider = { get: () => null }
    bond('cache', cacheProvider)
    expect(unbond('cache')).toBe(true)
    expect(get('cache')).toBeUndefined()
  })

  it('should return false for unbound custom named', () => {
    expect(unbond('queue', 'orders')).toBe(false)
  })

  it('should unbond custom named', () => {
    const ordersQueue = { send: () => {} }
    bond('queue', 'orders', ordersQueue)
    expect(unbond('queue', 'orders')).toBe(true)
    expect(get('queue', 'orders')).toBeUndefined()
  })
})

describe('unbondAll()', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('should unbond all OAuth providers', () => {
    bond('oauth', 'github', mockOAuthProvider)
    bond('oauth', 'google', { ...mockOAuthProvider, serverName: 'google' })
    unbondAll('oauth')
    expect(getAll('oauth').size).toBe(0)
  })

  it('should unbond all payment providers', () => {
    bond('payments', 'stripe', mockPaymentProvider)
    bond('payments', 'apple', { ...mockPaymentProvider, providerName: 'apple' })
    unbondAll('payments')
    expect(getAll('payments').size).toBe(0)
  })
})

describe('isBonded()', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('should return false for unbound singleton', () => {
    expect(isBonded('logger')).toBe(false)
  })

  it('should return true for bonded singleton', () => {
    bond('logger', mockLogger)
    expect(isBonded('logger')).toBe(true)
  })

  it('should return false for unbound email', () => {
    expect(isBonded('email')).toBe(false)
  })

  it('should return true for bonded email', () => {
    bond('email', mockEmailProvider)
    expect(isBonded('email')).toBe(true)
  })

  it('should return false for unbound named', () => {
    expect(isBonded('oauth', 'github')).toBe(false)
  })

  it('should return true for bonded named', () => {
    bond('oauth', 'github', mockOAuthProvider)
    expect(isBonded('oauth', 'github')).toBe(true)
  })

  it('should return false for different name', () => {
    bond('oauth', 'github', mockOAuthProvider)
    expect(isBonded('oauth', 'google')).toBe(false)
  })

  it('should return false for unbound uploads', () => {
    expect(isBonded('uploads')).toBe(false)
  })

  it('should return true for bonded uploads', () => {
    bond('uploads', mockUploadProvider)
    expect(isBonded('uploads')).toBe(true)
  })

  it('should return false for unbound payment', () => {
    expect(isBonded('payments', 'stripe')).toBe(false)
  })

  it('should return true for bonded payment', () => {
    bond('payments', 'stripe', mockPaymentProvider)
    expect(isBonded('payments', 'stripe')).toBe(true)
  })

  it('should return false for different payment name', () => {
    bond('payments', 'stripe', mockPaymentProvider)
    expect(isBonded('payments', 'apple')).toBe(false)
  })

  it('should return false for unbound custom singleton', () => {
    expect(isBonded('cache')).toBe(false)
  })

  it('should return true for bonded custom singleton', () => {
    bond('cache', { get: () => null })
    expect(isBonded('cache')).toBe(true)
  })

  it('should return false for unbound custom named', () => {
    expect(isBonded('queue', 'orders')).toBe(false)
  })

  it('should return true for bonded custom named', () => {
    bond('queue', 'orders', { send: () => {} })
    expect(isBonded('queue', 'orders')).toBe(true)
  })
})

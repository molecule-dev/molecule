vi.mock('@molecule/api-bond', () => {
  // Mirrors the real bond registry's singleton + named forms: a name maps to a
  // distinct `type:name` slot, exactly like bondNamed/getNamed/requireNamed.
  let store: Record<string, unknown> = {}
  const slot = (type: string, name?: string): string =>
    name !== undefined ? `${type}:${name}` : type
  return {
    bond: vi.fn((type: string, nameOrProvider: unknown, provider?: unknown) => {
      if (typeof nameOrProvider === 'string' && provider !== undefined) {
        store[slot(type, nameOrProvider)] = provider
      } else {
        store[type] = nameOrProvider
      }
    }),
    expectBond: vi.fn(),
    get: vi.fn((type: string, name?: string) => store[slot(type, name)]),
    isBonded: vi.fn((type: string, name?: string) => slot(type, name) in store),
    require: vi.fn((type: string, name?: string) => {
      const key = slot(type, name)
      if (!(key in store)) throw new Error(`No provider bonded for '${key}'`)
      return store[key]
    }),
    __reset: () => {
      store = {}
    },
  }
})

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((_key: string, _values?: unknown, options?: { defaultValue?: string }) => {
    return options?.defaultValue ?? _key
  }),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'

import type * as ProviderModule from '../provider.js'
import type { SandboxProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let requireProvider: typeof ProviderModule.requireProvider

const stub = (): SandboxProvider =>
  ({
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    destroy: vi.fn(),
  }) as unknown as SandboxProvider

describe('code-sandbox provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const bondModule = (await import('@molecule/api-bond')) as typeof BondModule & {
      __reset: () => void
    }
    bondModule.__reset()

    const mod = await import('../provider.js')
    setProvider = mod.setProvider
    getProvider = mod.getProvider
    hasProvider = mod.hasProvider
    requireProvider = mod.requireProvider
  })

  it('hasProvider returns false when nothing is bonded', () => {
    expect(hasProvider()).toBe(false)
  })

  it('getProvider returns null when nothing is bonded', () => {
    expect(getProvider()).toBeNull()
  })

  it('requireProvider throws with the i18n default message when nothing is bonded', () => {
    expect(() => requireProvider()).toThrow(/Code sandbox provider not configured/)
  })

  it('setProvider + getProvider returns the bonded provider', () => {
    const p = stub()
    setProvider(p)
    expect(getProvider()).toBe(p)
    expect(hasProvider()).toBe(true)
  })

  it('requireProvider returns the bonded provider', () => {
    const p = stub()
    setProvider(p)
    expect(requireProvider()).toBe(p)
  })

  it('setProvider replaces the existing provider', () => {
    const a = stub()
    const b = stub()
    setProvider(a)
    setProvider(b)
    expect(getProvider()).toBe(b)
  })

  describe('named providers', () => {
    it('a named provider is bonded alongside the singleton, not over it', () => {
      const dev = stub()
      const prod = stub()
      setProvider(dev)
      setProvider(prod, 'production')
      expect(getProvider()).toBe(dev)
      expect(getProvider('production')).toBe(prod)
      expect(requireProvider('production')).toBe(prod)
    })

    it('hasProvider/getProvider on an unbonded name miss even when the singleton exists', () => {
      setProvider(stub())
      expect(hasProvider('production')).toBe(false)
      expect(getProvider('production')).toBeNull()
    })

    it('requireProvider on an unbonded name throws and names the slot', () => {
      // A missing named slot must NEVER silently fall back to the singleton —
      // inheriting the wrong provider for a role is the failure this exists to
      // prevent.
      setProvider(stub())
      expect(() => requireProvider('production')).toThrow(/named provider: 'production'/)
    })

    it('re-bonding a name replaces only that slot', () => {
      const dev = stub()
      const prodA = stub()
      const prodB = stub()
      setProvider(dev)
      setProvider(prodA, 'production')
      setProvider(prodB, 'production')
      expect(getProvider('production')).toBe(prodB)
      expect(getProvider()).toBe(dev)
    })
  })

  it('requireProvider wraps the underlying bond error with the i18n message', () => {
    // No provider bonded: bondRequire throws a generic message; provider.ts
    // catches it and re-throws the friendly i18n string. Verify the friendly
    // string is what reaches callers (not the inner bond error).
    let err: unknown
    try {
      requireProvider()
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toBe(
      'Code sandbox provider not configured. Bond a code-sandbox provider first.',
    )
  })
})

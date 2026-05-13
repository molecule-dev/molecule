vi.mock('@molecule/api-bond', () => {
  let store: Record<string, unknown> = {}
  return {
    bond: vi.fn((type: string, provider: unknown) => {
      store[type] = provider
    }),
    expectBond: vi.fn(),
    get: vi.fn((type: string) => store[type]),
    isBonded: vi.fn((type: string) => type in store),
    require: vi.fn((type: string) => {
      if (!(type in store)) throw new Error(`No provider bonded for '${type}'`)
      return store[type]
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

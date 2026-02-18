import { describe, expect, it, vi } from 'vitest'

vi.mock('@angular/core', () => ({
  InjectionToken: class InjectionToken {
    _desc: string
    constructor(desc: string) {
      this._desc = desc
    }
    toString(): string {
      return `InjectionToken ${this._desc}`
    }
  },
}))

vi.mock('@molecule/app-auth', () => ({}))
vi.mock('@molecule/app-http', () => ({}))
vi.mock('@molecule/app-i18n', () => ({}))
vi.mock('@molecule/app-logger', () => ({}))
vi.mock('@molecule/app-routing', () => ({}))
vi.mock('@molecule/app-state', () => ({}))
vi.mock('@molecule/app-storage', () => ({}))
vi.mock('@molecule/app-theme', () => ({}))

import {
  AUTH_CLIENT,
  HTTP_CLIENT,
  I18N_PROVIDER,
  LOGGER_PROVIDER,
  ROUTER,
  STATE_PROVIDER,
  STORAGE_PROVIDER,
  THEME_PROVIDER,
} from '../tokens.js'

describe('tokens', () => {
  it('should create STATE_PROVIDER injection token', () => {
    expect(STATE_PROVIDER).toBeDefined()
    expect((STATE_PROVIDER as unknown as { _desc: string })._desc).toBe('molecule-state-provider')
  })

  it('should create AUTH_CLIENT injection token', () => {
    expect(AUTH_CLIENT).toBeDefined()
    expect((AUTH_CLIENT as unknown as { _desc: string })._desc).toBe('molecule-auth-client')
  })

  it('should create THEME_PROVIDER injection token', () => {
    expect(THEME_PROVIDER).toBeDefined()
    expect((THEME_PROVIDER as unknown as { _desc: string })._desc).toBe('molecule-theme-provider')
  })

  it('should create ROUTER injection token', () => {
    expect(ROUTER).toBeDefined()
    expect((ROUTER as unknown as { _desc: string })._desc).toBe('molecule-router')
  })

  it('should create I18N_PROVIDER injection token', () => {
    expect(I18N_PROVIDER).toBeDefined()
    expect((I18N_PROVIDER as unknown as { _desc: string })._desc).toBe('molecule-i18n-provider')
  })

  it('should create HTTP_CLIENT injection token', () => {
    expect(HTTP_CLIENT).toBeDefined()
    expect((HTTP_CLIENT as unknown as { _desc: string })._desc).toBe('molecule-http-client')
  })

  it('should create STORAGE_PROVIDER injection token', () => {
    expect(STORAGE_PROVIDER).toBeDefined()
    expect((STORAGE_PROVIDER as unknown as { _desc: string })._desc).toBe(
      'molecule-storage-provider',
    )
  })

  it('should create LOGGER_PROVIDER injection token', () => {
    expect(LOGGER_PROVIDER).toBeDefined()
    expect((LOGGER_PROVIDER as unknown as { _desc: string })._desc).toBe('molecule-logger-provider')
  })

  it('should create unique tokens for each provider', () => {
    const tokens = [
      STATE_PROVIDER,
      AUTH_CLIENT,
      THEME_PROVIDER,
      ROUTER,
      I18N_PROVIDER,
      HTTP_CLIENT,
      STORAGE_PROVIDER,
      LOGGER_PROVIDER,
    ]

    const uniqueDescs = new Set(tokens.map((t) => (t as unknown as { _desc: string })._desc))
    expect(uniqueDescs.size).toBe(8)
  })

  it('should create tokens as objects with _desc property', () => {
    const tokens = [
      STATE_PROVIDER,
      AUTH_CLIENT,
      THEME_PROVIDER,
      ROUTER,
      I18N_PROVIDER,
      HTTP_CLIENT,
      STORAGE_PROVIDER,
      LOGGER_PROVIDER,
    ]

    for (const token of tokens) {
      expect(token).toBeTypeOf('object')
      expect((token as unknown as { _desc: string })._desc).toBeTypeOf('string')
      expect((token as unknown as { _desc: string })._desc.length).toBeGreaterThan(0)
    }
  })
})

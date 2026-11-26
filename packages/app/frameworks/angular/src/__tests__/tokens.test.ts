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

vi.mock('@molecule/app-auth', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-routing', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-state', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-storage', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-theme', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))

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

/** Anything that describes itself: every injection token does. */
interface DescribedToken {
  toString(): string
}

/**
 * The description an injection token carries, read through its public
 * `toString()` (`InjectionToken <description>`) rather than the private field.
 *
 * @param token - The token to describe.
 * @returns The token's description.
 */
function descriptionOf(token: DescribedToken): string {
  return token.toString().replace(/^InjectionToken /, '')
}

describe('tokens', () => {
  it('should create STATE_PROVIDER injection token', () => {
    expect(STATE_PROVIDER).toBeDefined()
    expect(descriptionOf(STATE_PROVIDER)).toBe('molecule-state-provider')
  })

  it('should create AUTH_CLIENT injection token', () => {
    expect(AUTH_CLIENT).toBeDefined()
    expect(descriptionOf(AUTH_CLIENT)).toBe('molecule-auth-client')
  })

  it('should create THEME_PROVIDER injection token', () => {
    expect(THEME_PROVIDER).toBeDefined()
    expect(descriptionOf(THEME_PROVIDER)).toBe('molecule-theme-provider')
  })

  it('should create ROUTER injection token', () => {
    expect(ROUTER).toBeDefined()
    expect(descriptionOf(ROUTER)).toBe('molecule-router')
  })

  it('should create I18N_PROVIDER injection token', () => {
    expect(I18N_PROVIDER).toBeDefined()
    expect(descriptionOf(I18N_PROVIDER)).toBe('molecule-i18n-provider')
  })

  it('should create HTTP_CLIENT injection token', () => {
    expect(HTTP_CLIENT).toBeDefined()
    expect(descriptionOf(HTTP_CLIENT)).toBe('molecule-http-client')
  })

  it('should create STORAGE_PROVIDER injection token', () => {
    expect(STORAGE_PROVIDER).toBeDefined()
    expect(descriptionOf(STORAGE_PROVIDER)).toBe('molecule-storage-provider')
  })

  it('should create LOGGER_PROVIDER injection token', () => {
    expect(LOGGER_PROVIDER).toBeDefined()
    expect(descriptionOf(LOGGER_PROVIDER)).toBe('molecule-logger-provider')
  })

  it('should create unique tokens for each provider', () => {
    const tokens: DescribedToken[] = [
      STATE_PROVIDER,
      AUTH_CLIENT,
      THEME_PROVIDER,
      ROUTER,
      I18N_PROVIDER,
      HTTP_CLIENT,
      STORAGE_PROVIDER,
      LOGGER_PROVIDER,
    ]

    const uniqueDescs = new Set(tokens.map(descriptionOf))
    expect(uniqueDescs.size).toBe(8)
  })

  it('should create tokens as objects with _desc property', () => {
    const tokens: DescribedToken[] = [
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
      const description = descriptionOf(token)
      expect(description).toBeTypeOf('string')
      expect(description.length).toBeGreaterThan(0)
    }
  })
})

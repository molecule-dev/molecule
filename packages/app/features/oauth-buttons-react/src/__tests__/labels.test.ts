import { describe, expect, it } from 'vitest'

import { dedupeProviders, getProviderLabel, PROVIDER_LABELS } from '../labels.js'

describe('PROVIDER_LABELS', () => {
  it('covers every canonical OAuth provider id', () => {
    const expected = [
      'github',
      'gitlab',
      'google',
      'twitter',
      'x',
      'apple',
      'facebook',
      'microsoft',
      'linkedin',
      'discord',
    ] as const
    for (const id of expected) {
      expect(PROVIDER_LABELS[id]).toBeDefined()
      expect(PROVIDER_LABELS[id].key).toMatch(/^oauthButtons\.provider\./)
      expect(PROVIDER_LABELS[id].default.length).toBeGreaterThan(0)
    }
  })

  it('uses oauthButtons.provider.<id> as the namespaced i18n key', () => {
    expect(PROVIDER_LABELS.github.key).toBe('oauthButtons.provider.github')
    expect(PROVIDER_LABELS.google.key).toBe('oauthButtons.provider.google')
  })
})

describe('getProviderLabel', () => {
  it('returns the canonical entry for known providers', () => {
    expect(getProviderLabel('github')).toEqual({
      key: 'oauthButtons.provider.github',
      default: 'GitHub',
    })
  })

  it('synthesizes a sane fallback for unknown providers', () => {
    const result = getProviderLabel('keycloak')
    expect(result.key).toBe('oauthButtons.provider.keycloak')
    expect(result.default).toBe('Keycloak')
  })

  it('does not crash on empty string', () => {
    const result = getProviderLabel('')
    expect(result.default).toBe('')
    expect(result.key).toBe('oauthButtons.provider.')
  })
})

describe('dedupeProviders', () => {
  it('preserves order while removing duplicates', () => {
    expect(dedupeProviders(['google', 'github', 'google', 'gitlab', 'github'])).toEqual([
      'google',
      'github',
      'gitlab',
    ])
  })

  it('returns an empty array unchanged', () => {
    expect(dedupeProviders([])).toEqual([])
  })

  it('returns a fresh array (does not mutate input)', () => {
    const input = ['google', 'github'] as const
    const out = dedupeProviders(input)
    expect(out).not.toBe(input)
    expect(out).toEqual(['google', 'github'])
  })
})

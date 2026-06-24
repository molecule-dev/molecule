/**
 * The CTA-href routing decisions for the in-app auth/upgrade interceptor: which
 * links open the modal, which open a new tab, and which are left to navigate.
 */

import { describe, expect, it } from 'vitest'

import { authModeForHref, upgradePathForHref } from '../cta-intercept.js'

const ORIGIN = 'https://app.example'

describe('authModeForHref', () => {
  it('maps the auth CTAs to their modal mode (relative + absolute)', () => {
    expect(authModeForHref('/login', ORIGIN)).toBe('login')
    expect(authModeForHref('/signup', ORIGIN)).toBe('signup')
    expect(authModeForHref('https://app.example/login', ORIGIN)).toBe('login')
    expect(authModeForHref('https://app.example/signup?from=cta', ORIGIN)).toBe('signup')
  })

  it('leaves non-auth links alone', () => {
    expect(authModeForHref('/pricing', ORIGIN)).toBeNull()
    expect(authModeForHref('/dashboard', ORIGIN)).toBeNull()
    expect(authModeForHref('https://github.com/molecule-dev/molecule', ORIGIN)).toBeNull()
  })

  it('is null-safe for missing/malformed hrefs', () => {
    expect(authModeForHref(null, ORIGIN)).toBeNull()
    expect(authModeForHref(undefined, ORIGIN)).toBeNull()
    expect(authModeForHref('', ORIGIN)).toBeNull()
  })

  it('honors a custom path map', () => {
    expect(authModeForHref('/enter', ORIGIN, { '/enter': 'login' })).toBe('login')
    expect(authModeForHref('/login', ORIGIN, { '/enter': 'login' })).toBeNull()
  })
})

describe('upgradePathForHref', () => {
  it('matches the upgrade/billing routes', () => {
    expect(upgradePathForHref('/pricing', ORIGIN)).toBe('/pricing')
    expect(upgradePathForHref('/billing', ORIGIN)).toBe('/billing')
    expect(upgradePathForHref('https://app.example/pricing?plan=pro', ORIGIN)).toBe('/pricing')
  })

  it('leaves auth + other links alone', () => {
    expect(upgradePathForHref('/login', ORIGIN)).toBeNull()
    expect(upgradePathForHref('/', ORIGIN)).toBeNull()
    expect(upgradePathForHref(null, ORIGIN)).toBeNull()
  })

  it('honors a custom upgrade-path list', () => {
    expect(upgradePathForHref('/plans', ORIGIN, ['/plans'])).toBe('/plans')
    expect(upgradePathForHref('/pricing', ORIGIN, ['/plans'])).toBeNull()
  })
})

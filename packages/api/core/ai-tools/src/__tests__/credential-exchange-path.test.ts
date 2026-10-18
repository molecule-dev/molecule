import { describe, expect, it } from 'vitest'

import { isCredentialExchangePath } from '../trace-artifacts.js'

/**
 * The path half of the credential-exchange classifier, as a caller holding only a `METHOD path`
 * reads it — the whole-suite Hurl note (xr-molecule-flash-m176): a wrong-password login that
 * answered 200 is the app accepting bad credentials, never a cookie-jar effect.
 */
describe('isCredentialExchangePath', () => {
  it('names a login, a registration and a token endpoint', () => {
    expect(isCredentialExchangePath('/api/users/login')).toBe(true)
    expect(isCredentialExchangePath('/api/users/sign-up')).toBe(true)
    expect(isCredentialExchangePath('/api/oauth/token')).toBe(true)
    expect(isCredentialExchangePath('/auth/signin')).toBe(true)
    expect(isCredentialExchangePath('/session')).toBe(false)
  })

  it('leaves a protected resource that presents a token alone', () => {
    expect(isCredentialExchangePath('/api/articles')).toBe(false)
    expect(isCredentialExchangePath('/api/user')).toBe(false)
    expect(isCredentialExchangePath('/api/profiles/alice')).toBe(false)
  })

  it('matches an endpoint the app’s own auth config names, as a path suffix', () => {
    expect(isCredentialExchangePath('/api/session', ['/session'])).toBe(true)
    expect(isCredentialExchangePath('/api/session', ['/signin'])).toBe(false)
  })

  it('ignores a query or fragment and a trailing slash', () => {
    expect(isCredentialExchangePath('/api/users/login?uid=1')).toBe(true)
    expect(isCredentialExchangePath('/api/users/login/')).toBe(true)
    expect(isCredentialExchangePath('')).toBe(false)
  })
})

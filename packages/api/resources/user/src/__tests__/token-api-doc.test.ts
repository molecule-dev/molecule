/**
 * A RealWorld-style token API — scheme, token in the body, password change — must be
 * DOCUMENTED at the source, because that is the surface a run reads.
 *
 * xr-flash-m167 (+03:42 → +06:43, 2026-10-17): believing this package only did
 * cookie-session auth, the model hand-wrote a `user_credentials` table with its own
 * password hash and a `tokenSecret` folded into the JWT, then lost ~3.5 minutes of a
 * 7-minute run to the drift between its table and the package's `usersSecrets` — including
 * a second password PUT answered 401 because its own secret rotation retired the token.
 * Nothing in the package said header-token auth, a configurable scheme and a token in the
 * response body already existed. The module JSDoc and the generated README are what
 * `read_molecule_doc @molecule/api-resource-user` serves, so they are checked here.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/** A file of the package, read as text. */
const read = (file: string): string => readFileSync(join(PACKAGE, file), 'utf8')

/** The module JSDoc — everything between the file's first opening block and its close. */
function moduleDoc(source: string): string {
  return source.slice(source.indexOf('/**'), source.indexOf('*/'))
}

describe('the RealWorld-style token API guidance (xr-flash-m167)', () => {
  it('names the scheme configuration and the token-only mount in the module JSDoc', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('AUTH_SCHEME=Token')
    expect(doc).toContain("verifyMiddleware({ scheme: 'Token'")
    expect(doc).toContain('allowCookieSession')
    // It is configuration on the SAME auth path — not a second credentials layer.
    expect(doc).toContain('credentials table')
    expect(doc).toContain('usersSecrets.passwordHash')
    expect(doc).toContain('never a credentials table of your own')
  })

  it('says the token is already in the body of login, register and current-user', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('logIn`/`create` return `accessToken`')
    expect(doc).toContain('handlers.logIn')
    expect(doc).toContain('handlers.create')
    expect(doc).toContain('GET /users/me')
  })

  it('says a password change keeps the caller’s own session', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('revokes every OTHER device')
    expect(doc).toContain('keeps the')
    expect(doc).toContain("caller's own session")
  })

  it('says the client labels its header at the constructor, not the built client', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain("createFetchClient({ baseURL, authScheme: 'Token' })")
    expect(doc).toContain("`getClient()`'s result")
  })

  it('documents the scheme on verifyMiddleware’s options, where a reader lands', () => {
    const source = read('src/authorization.ts')
    const at = source.indexOf('scheme?: string')
    expect(at).toBeGreaterThan(-1)
    const field = source.slice(source.lastIndexOf('/**', at), at)
    expect(field).toContain('RealWorld')
    expect(field).toContain('AUTH_SCHEME')
  })

  it('documents the kept session on the updatePassword handler', () => {
    const source = read('src/handlers/updatePassword.ts')
    const at = source.indexOf('export const updatePassword')
    const doc = source.slice(source.lastIndexOf('/**', at), at)
    expect(doc).toContain('Every OTHER session is revoked')
    expect(doc).toContain('keeps working')
  })

  it('carries all of it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    const head = readme.slice(0, readme.indexOf('## Quick Start'))
    expect(head).toContain('AUTH_SCHEME=Token')
    expect(head).toContain("verifyMiddleware({ scheme: 'Token'")
    expect(head).toContain('logIn`/`create` return `accessToken`')
    expect(head).toContain('revokes every OTHER device')
    // The full recipe (mount + body example) renders in the notes section.
    expect(readme).toContain("createFetchClient({ baseURL, authScheme: 'Token' })")
  })
})

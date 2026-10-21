/**
 * The auth contracts a run kept re-deriving from `dist` — token sessions, the email step-up and
 * the password-change inputs — at the module level, where `read_molecule_doc` serves them.
 *
 * xr-flash-m337 / m347 (2026-10-21): hand-rolled `Token` auth and a hand-signed JWT that every
 * route answered 401, then ~12 calls re-reading `authorization.js` to find out why. The package
 * DID support both the scheme and the device-bound session, but the run only learned it by
 * trial. xr-flash-m372: ~11 minutes on `PUT /api/user` because the email-change step-up was not
 * in the doc, ending with an in-memory cache that REPLAYED the user's plaintext password as
 * `currentPassword`. xr-flash-m352: five edits and 15 reads of the built handler because the
 * password-change body was never stated (and its reviewer's guess — "only `newPassword`" — is
 * false for a password account).
 *
 * So the module description (rendered at the top of the generated README, which survives the doc
 * read's truncation) and the two handler docstrings are checked here. The security posture is
 * part of the contract being asserted: the docs must never present a bypass.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/**
 * Read a file of the package as text.
 *
 * @param file - Path relative to the package root.
 * @returns The file's contents.
 */
const read = (file: string): string => readFileSync(join(PACKAGE, file), 'utf8')

/**
 * The module JSDoc — everything from the first opening block to its close.
 *
 * @param source - A source file's text.
 * @returns The first doc comment.
 */
function moduleDoc(source: string): string {
  return source.slice(source.indexOf('/**'), source.indexOf('*/'))
}

/**
 * The JSDoc block immediately above a marker.
 *
 * @param source - A source file's text.
 * @param marker - Text to locate (e.g. `export const updatePassword`).
 * @returns The doc comment that precedes it.
 */
function docFor(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`no \`${marker}\` in the source`)
  const open = source.lastIndexOf('/**', at)
  return source.slice(open, source.indexOf('*/', open))
}

describe('the auth contracts in @molecule/api-resource-user’s own docs (m337/m347/m352/m372)', () => {
  it('says a self-signed JWT is not a session, in the module description', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('A JWT you sign yourself is NOT a session')
    // The two conditions verifyMiddleware actually enforces.
    expect(doc).toContain('@molecule/api-jwt')
    expect(doc).toContain('ACTIVE row')
    // And the outcome, including the 401 body a run saw.
    expect(doc).toContain('401')
    expect(doc).toContain('is missing')
  })

  it('states the email and password step-up, with its exact inputs and codes', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('Changing the EMAIL or the PASSWORD requires the CURRENT password')
    expect(doc).toContain('user.error.currentPasswordRequired')
    expect(doc).toContain('user.error.currentPasswordIncorrect')
    expect(doc).toContain('emailVerified` to `false')
    expect(doc).toContain('newPassword')
    // The password account case — the false "only newPassword" reading is excluded.
    expect(doc).toContain('on a password account, `currentPassword` as well')
  })

  it('says which flow is unsupported and that there is no bypass — never shows one', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('Do NOT work around either gate')
    expect(doc).toContain('replaying the user')
    expect(doc).toContain('invented `currentPassword`')
    expect(doc).toContain('unsupported as written')
    expect(doc).toContain('There is no supported bypass to add')
    // Guard the security posture: no opt-out option may be advertised as the escape hatch.
    expect(doc).not.toContain('emailChangeRequiresPassword')
    expect(doc).not.toContain('skipPasswordCheck')
  })

  it('documents the email re-authentication gate on the update handler', () => {
    const doc = docFor(read('src/handlers/update.ts'), 'export const update')
    expect(doc).toContain('A change to `email` is re-authenticated')
    expect(doc).toContain('user.error.currentPasswordRequired')
    expect(doc).toContain('emailVerified')
    expect(doc).toContain('Do NOT skip the gate')
  })

  it('documents the password-change body and result on the handler', () => {
    const doc = docFor(read('src/handlers/updatePassword.ts'), 'export const updatePassword')
    expect(doc).toContain('Body and results')
    expect(doc).toContain('`currentPassword` too')
    expect(doc).toContain('there is no variant that changes a password account')
    expect(doc).toContain('Only an account with no password hash')
    expect(doc).toContain('{ success: true }')
    expect(doc).toContain('outstanding reset')
    // The security invariant already documented on this handler must survive.
    expect(doc).toContain('Every OTHER session is revoked')
  })

  it('carries the contracts into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    const head = readme.slice(0, readme.indexOf('## Quick Start'))
    expect(head).toContain('A JWT you sign yourself is NOT a session')
    expect(head).toContain('Changing the EMAIL or the PASSWORD requires the CURRENT password')
    expect(head).toContain('There is no supported bypass to add')
    // The handler entries render in the API section.
    expect(readme).toContain('A change to `email` is re-authenticated')
    expect(readme).toContain('Body and results')
  })
})

/**
 * The Solid auth binding carries the app's OWN registration fields, like the
 * auth client does (`createJWTAuthClient<AppUser, { username: string }>`).
 *
 * Compiled with the TypeScript API against the REAL primitives: the probe is a
 * two-type-argument call, which the pre-fix single-generic signature rejects
 * (TS2558) and whose `register` payload rejected `username` (TS2353).
 */

import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createTypeCheck } from './typeCheck.js'

/** Compiles a probe as a file of this package and returns its diagnostics. */
const diagnosticsFor = createTypeCheck(join(__dirname, '__typed-probe__.ts'))

describe('createAuth types the app’s own registration fields', () => {
  it('accepts the client’s second generic through the primitives and helpers', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { createAuth, createAuthFromClient, createAuthHelpers } from '../primitives/auth.js'

interface AppUser {
  id: string
}

interface AppRegisterFields {
  username: string
}

const client = createJWTAuthClient<AppUser, AppRegisterFields>({ storage: 'memory' })

export function viaPrimitives() {
  const { register } = createAuth<AppUser, AppRegisterFields>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}

export function viaHelpers() {
  const { register } = createAuthHelpers<AppUser, AppRegisterFields>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}

export function viaClient() {
  const { register } = createAuthFromClient(client)
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 240_000)
})

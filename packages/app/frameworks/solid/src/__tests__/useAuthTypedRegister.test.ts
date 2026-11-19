/**
 * `useAuth` / `useAuthClient` must carry the app's OWN registration fields, the
 * same way `createJWTAuthClient` does.
 *
 * The probes below are compiled with the TypeScript API against the REAL Solid
 * primitives, so this test fails when the second generic is dropped again.
 */

import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createTypeCheck } from './typeCheck.js'

/** Compiles a probe as a file of this package and returns its diagnostics. */
const diagnosticsFor = createTypeCheck(join(__dirname, '__typed-probe__.ts'))

/** The imports and app types every probe shares. */
const preamble = `
import { createJWTAuthClient } from '@molecule/app-auth'
import { useAuth, useAuthClient } from '../primitives/auth.js'

interface AppUser {
  id: string
  email?: string
  username?: string
}

interface AppRegisterFields {
  username: string
}

const client = createJWTAuthClient<AppUser, AppRegisterFields>({
  storage: 'memory',
  requestBody: (kind, payload) => ({ user: payload }),
})
`

describe('useAuth types the app’s own registration fields', () => {
  it('accepts the client’s second generic and passes custom fields to register()', () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export function viaUseAuth() {
  const { register } = useAuth<AppUser, AppRegisterFields>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}

export function viaAuthClient() {
  const typed = useAuthClient<AppUser, AppRegisterFields>()
  return (data: { email: string; password: string; username: string }) => typed.register(data)
}

export const wiring = client
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 240_000)

  it('still rejects custom fields when the hook is used without the second generic', () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export function untyped() {
  const { register } = useAuth<AppUser>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}
`)

    expect(diagnostics.join('\n')).toContain('username')
  }, 240_000)

  it('takes a type alias for the same fields', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { useAuth } from '../primitives/auth.js'

interface AppUser {
  id: string
}

type AppRegisterFields = {
  username: string
}

const client = createJWTAuthClient<AppUser, AppRegisterFields>({ storage: 'memory' })

export function viaUseAuth() {
  const { register } = useAuth<AppUser, AppRegisterFields>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}

export const wiring = client
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 240_000)
})

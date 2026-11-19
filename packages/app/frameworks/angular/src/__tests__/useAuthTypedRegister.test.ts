/**
 * `useAuth` / `useAuthClient` carry the app's OWN registration fields, the same
 * way `createJWTAuthClient` does.
 *
 * The client's second generic (`createJWTAuthClient<AppUser, { username: string }>`)
 * types `register({ email, password, username })` and hands `requestBody`
 * exactly what the form passed — the documented way a RealWorld-shaped API
 * gets its `username`. The probes below are compiled with the TypeScript API
 * against the REAL function source, so this test fails when the generic is
 * dropped again.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Compiles `source` as a file of this package and returns its diagnostics.
 *
 * @param source - The TypeScript source to check.
 * @returns The diagnostic messages.
 */
function diagnosticsFor(source: string): string[] {
  const configPath = join(__dirname, '..', '..', 'tsconfig.json')
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    { noEmit: true },
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  )
  const options: ts.CompilerOptions = { ...(parsed?.options ?? {}), noEmit: true }
  const virtualFile = join(__dirname, '__typed-probe__.ts')
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  host.fileExists = (fileName) => fileName === virtualFile || fileExists(fileName)
  host.readFile = (fileName) => (fileName === virtualFile ? source : readFile(fileName))
  const program = ts.createProgram([virtualFile], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('useAuth types the app’s own registration fields', () => {
  it(
    'accepts the client’s second generic and passes custom fields to register()',
    { timeout: 120_000 },
    () => {
      const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { useAuth, useAuthClient } from '../hooks/use-auth.js'

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
    },
  )

  it(
    'still rejects custom fields when the hook is used without the second generic',
    { timeout: 120_000 },
    () => {
      const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { useAuth } from '../hooks/use-auth.js'

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

export function untyped() {
  const { register } = useAuth<AppUser>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}

export const wiring = client
`)

      expect(diagnostics.join('\n')).toContain('username')
    },
  )

  it('takes a type alias for the same fields', { timeout: 120_000 }, () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { useAuth } from '../hooks/use-auth.js'

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
  })
})

/**
 * The Vue auth binding carries the app's OWN registration fields, like the
 * auth client does (`createJWTAuthClient<AppUser, { username: string }>`).
 *
 * Compiled with the TypeScript API against the REAL composables: the probe is
 * a two-type-argument call, which the pre-fix single-generic signature rejects
 * (TS2558) and whose `register` payload rejected `username` (TS2353).
 */

import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const probeFile = join(__dirname, '__typed-probe__.ts')

let packageOptions: ts.CompilerOptions | undefined
let packageHost: ts.CompilerHost | undefined
let probeSource = ''
let previousProgram: ts.Program | undefined

/**
 * The package's own compiler options, parsed once for every probe.
 *
 * @returns The compiler options.
 */
function optionsForPackage(): ts.CompilerOptions {
  if (packageOptions === undefined) {
    const configPath = join(__dirname, '..', '..', 'tsconfig.json')
    const parsed = ts.getParsedCommandLineOfConfigFile(
      configPath,
      { noEmit: true },
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: () => undefined,
      },
    )
    packageOptions = { ...(parsed?.options ?? {}), noEmit: true }
  }
  return packageOptions
}

/**
 * The compiler host, kept across probes so its file cache and the previous
 * program are reused: a fresh program per probe parses every library and
 * dependency declaration again, which took long enough to time out under load.
 *
 * @returns The compiler host, reading the current probe source.
 */
function hostForPackage(): ts.CompilerHost {
  if (packageHost === undefined) {
    const host = ts.createCompilerHost(optionsForPackage())
    const getSourceFile = host.getSourceFile.bind(host)
    const fileExists = host.fileExists.bind(host)
    const readFile = host.readFile.bind(host)
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
      fileName === probeFile
        ? ts.createSourceFile(fileName, probeSource, languageVersion, true, ts.ScriptKind.TS)
        : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
    host.fileExists = (fileName) => fileName === probeFile || fileExists(fileName)
    host.readFile = (fileName) => (fileName === probeFile ? probeSource : readFile(fileName))
    packageHost = host
  }
  return packageHost
}

/**
 * Compiles `source` as a file of this package and returns its diagnostics.
 *
 * @param source - The TypeScript source to check.
 * @returns The diagnostic messages.
 */
function diagnosticsFor(source: string): string[] {
  probeSource = source
  const program = ts.createProgram(
    [probeFile],
    optionsForPackage(),
    hostForPackage(),
    previousProgram,
  )
  previousProgram = program
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('useAuth types the app’s own registration fields', () => {
  it(
    'accepts the client’s second generic through useAuth and useAuthClient',
    { timeout: 120_000 },
    () => {
      const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { useAuth, useAuthClient } from '../composables/useAuth.js'

interface AppUser {
  id: string
}

interface AppRegisterFields {
  username: string
}

const client = createJWTAuthClient<AppUser, AppRegisterFields>({ storage: 'memory' })

export function viaComposable() {
  const { register } = useAuth<AppUser, AppRegisterFields>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}

export function viaInjectedClient() {
  const typed = useAuthClient<AppUser, AppRegisterFields>()
  return () => typed.register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}

export const wiring = client
`)

      expect(diagnostics.join('\n')).toEqual('')
    },
  )

  it(
    'accepts the client’s second generic and passes custom fields to register()',
    { timeout: 120_000 },
    () => {
      const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { useAuth, useAuthClient } from '../composables/useAuth.js'

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
import { useAuth } from '../composables/useAuth.js'

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
import { useAuth } from '../composables/useAuth.js'

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

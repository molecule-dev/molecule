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
  it('accepts the client’s second generic through useAuth and useAuthClient', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { useAuth, useAuthClient } from '../composables/useAuth.js'

interface AppUser {
  id: string
}

type AppRegisterFields = {
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
  })
})

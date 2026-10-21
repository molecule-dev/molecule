/**
 * The Svelte auth binding carries the app's OWN registration fields, like the
 * auth client does (`createJWTAuthClient<AppUser, { username: string }>`).
 *
 * Compiled with the TypeScript API against the REAL stores: the probe is a
 * two-type-argument call, which the pre-fix single-generic signature rejects
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

describe('createAuthStores types the app’s own registration fields', () => {
  it('accepts the client’s second generic through both factories', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { createAuthStores, createAuthStoresFromClient } from '../stores/auth.js'

interface AppUser {
  id: string
}

interface AppRegisterFields {
  username: string
}

const client = createJWTAuthClient<AppUser, AppRegisterFields>({ storage: 'memory' })

export function viaContext() {
  const { register } = createAuthStores<AppUser, AppRegisterFields>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}

export function viaClient() {
  const { register } = createAuthStoresFromClient(client)
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })
})

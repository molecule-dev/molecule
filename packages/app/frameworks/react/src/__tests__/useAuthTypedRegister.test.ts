/**
 * `useAuth` / `useAuthClient` must carry the app's OWN registration fields,
 * the same way `createJWTAuthClient` does.
 *
 * The client's second generic (`createJWTAuthClient<AppUser, { username: string }>`)
 * types `register({ email, password, username })` and hands `requestBody`
 * exactly what the form passed — the documented way a RealWorld-shaped API
 * gets its `username`. The React binding erased that generic: it accepted one
 * type argument and its `register` demanded `RegisterData<Record<never, never>>`,
 * so the documented call did not compile through the hook. An app that hit
 * this either cast the payload or dropped to its own fetch/session module
 * (xr-molecule-flash-m389's hand-built session module, m390's `api.register`
 * beside the client's `register`).
 *
 * The probes below are compiled with the TypeScript API against the REAL hook
 * source, so this test fails when the generic is dropped again.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Compiles `source` as if it were a file in this package and returns the
 * flattened diagnostics.
 *
 * @param source - The TSX source to check.
 * @returns The diagnostic messages TypeScript reports.
 */
function diagnosticsFor(source: string): string[] {
  const virtualFile = join(__dirname, '__typed-probe__.tsx')
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TSX)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  host.fileExists = (fileName) => fileName === virtualFile || fileExists(fileName)
  host.readFile = (fileName) => (fileName === virtualFile ? source : readFile(fileName))
  const program = ts.createProgram([virtualFile], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

/** The imports and app types every probe shares. */
const preamble = `
import { createJWTAuthClient } from '@molecule/app-auth'
import { AuthProvider } from '../providers.js'
import { useAuth, useAuthClient } from '../hooks/useAuth.js'

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

export const wiring = <AuthProvider client={client}>{null}</AuthProvider>

export function viaUseAuth() {
  const { register } = useAuth<AppUser, AppRegisterFields>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}

export function viaAuthClient() {
  const typed = useAuthClient<AppUser, AppRegisterFields>()
  return (data: { email: string; password: string; username: string }) => typed.register(data)
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('still rejects custom fields when the hook is used without the second generic', () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export function untyped() {
  const { register } = useAuth<AppUser>()
  return () => register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
}
`)

    expect(diagnostics.join('\n')).toContain('username')
  })

  it('takes a type alias for the same fields', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'
import { useAuth } from '../hooks/useAuth.js'

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

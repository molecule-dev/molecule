/**
 * An app's custom registration fields may be declared as an ordinary
 * `interface`.
 *
 * `createJWTAuthClient<User, { username: string }>` typed those fields, but the
 * generic was constrained to `Record<string, unknown>` — and TypeScript gives
 * an `interface` no implicit index signature, so the SAME fields declared as
 * `interface CustomRegister { username: string }` were rejected with "Index
 * signature for type 'string' is missing". The docs then taught the type-alias
 * workaround, which the executor followed instead of a real structural
 * constraint: the app had to restructure its own declarations for the client's
 * benefit.
 *
 * The probes compile against the REAL source with the TypeScript API. The
 * known-bad control below proves the old constraint fails a valid interface;
 * the other probes prove the fixed one accepts it and still rejects the
 * malformed payloads.
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

/** The app types and client every probe shares. */
const preamble = `
import { createJWTAuthClient } from '../client.js'
import type { RegisterData, UserProfile } from '../types.js'

interface AppUser extends UserProfile {
  username?: string
}

interface CustomRegister {
  username: string
}

const client = createJWTAuthClient<AppUser, CustomRegister>({ storage: 'memory' })
`

describe('custom registration fields accept an ordinary interface', () => {
  it('takes an interface as the client’s second generic', () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export const send = () =>
  client.register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('types RegisterData with an interface directly', () => {
    const diagnostics = diagnosticsFor(`
import type { RegisterData } from '../types.js'

interface CustomRegister {
  username: string
}

export const data: RegisterData<CustomRegister> = {
  email: 'reader@example.test',
  password: 'pw',
  username: 'reader',
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('still takes a type alias', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'
import type { UserProfile } from '../types.js'

interface AppUser extends UserProfile {
  username?: string
}

type AliasRegister = { username: string }

const client = createJWTAuthClient<AppUser, AliasRegister>({ storage: 'memory' })

export const send = () =>
  client.register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('leaves a caller without the second generic unchanged', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'
import type { UserProfile } from '../types.js'

interface AppUser extends UserProfile {
  username?: string
}

const client = createJWTAuthClient<AppUser>({ storage: 'memory' })

export const send = () =>
  client.register({ email: 'reader@example.test', password: 'pw', name: 'Reader', metadata: {} })
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('the old Record<string, unknown> constraint rejects the same interface', () => {
    const diagnostics = diagnosticsFor(`
interface CustomRegister {
  username: string
}

declare function legacyClient<TRegister extends Record<string, unknown>>(): TRegister

export const rejected = legacyClient<CustomRegister>()
`)

    expect(diagnostics.join('\n')).toContain('Index signature for type')
  })

  it('still requires a custom field the interface declares', () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export const send = () => client.register({ email: 'reader@example.test', password: 'pw' })
`)

    expect(diagnostics.join('\n')).toContain('username')
  })

  it('still rejects a mistyped custom field', () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export const send = () =>
  client.register({ email: 'reader@example.test', password: 'pw', username: 42 })
`)

    expect(diagnostics.join('\n')).toContain('number')
  })

  it('still rejects a mistyped email or password', () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export const send = () =>
  client.register({ email: 42, password: 'pw', username: 'reader' })
`)

    expect(diagnostics.join('\n')).toContain('number')
  })

  it('rejects an interface that overrides a built-in field with a wrong type', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'
import type { UserProfile } from '../types.js'

interface AppUser extends UserProfile {
  username?: string
}

interface BadRegister {
  username: string
  email: number
}

export const client = createJWTAuthClient<AppUser, BadRegister>({ storage: 'memory' })
`)

    expect(diagnostics.join('\n')).toContain('not assignable')
  })

  it('rejects fields that are not an object', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'
import type { UserProfile } from '../types.js'

export const client = createJWTAuthClient<UserProfile, string>({ storage: 'memory' })
`)

    expect(diagnostics.join('\n')).not.toEqual('')
  })
})

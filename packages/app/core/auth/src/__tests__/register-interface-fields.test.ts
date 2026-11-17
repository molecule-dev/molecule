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
/**
 * The compiler options every probe shares (this package's own tsconfig, no emit)
 * and one host whose parsed source files are reused across probes. Every call
 * would otherwise re-read and re-parse lib and the whole `@molecule/*` peer
 * declaration graph — seconds per program, dozens of programs per file.
 */
const probeOptions: ts.CompilerOptions = (() => {
  const configPath = join(__dirname, '..', '..', 'tsconfig.json')
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    { noEmit: true },
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  )
  return { ...(parsed?.options ?? {}), noEmit: true }
})()

const sharedProbeHost = (() => {
  const base = ts.createCompilerHost(probeOptions)
  const cache = new Map<string, ts.SourceFile | undefined>()
  const baseGetSourceFile = base.getSourceFile.bind(base)
  base.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (!cache.has(fileName)) {
      cache.set(
        fileName,
        baseGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile),
      )
    }
    return cache.get(fileName)
  }
  return { host: base, forget: (fileName: string) => cache.delete(fileName) }
})()

function diagnosticsFor(source: string): string[] {
  const virtualFile = join(__dirname, '__typed-probe__.ts')
  const { host } = sharedProbeHost
  const packageGetSourceFile = host.getSourceFile.bind(host)
  const packageFileExists = host.fileExists.bind(host)
  const packageReadFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
      : packageGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  host.fileExists = (fileName) => fileName === virtualFile || packageFileExists(fileName)
  host.readFile = (fileName) => (fileName === virtualFile ? source : packageReadFile(fileName))
  const program = ts.createProgram([virtualFile], probeOptions, host)
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  // Restore the shared host and drop this probe's virtual file from its cache:
  // the next call reuses the file name with different content.
  host.getSourceFile = packageGetSourceFile
  host.fileExists = packageFileExists
  host.readFile = packageReadFile
  sharedProbeHost.forget(virtualFile)
  return diagnostics
}

/**
 * One probe runs a full `ts.createProgram` in-process, which legitimately takes
 * seconds on a loaded machine — a budget of its own instead of the 5 s default
 * that guards runtime tests against hangs.
 */
const PROBE_TIMEOUT_MS = 30_000

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
  it('takes an interface as the client’s second generic', { timeout: PROBE_TIMEOUT_MS }, () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export const send = () =>
  client.register({ email: 'reader@example.test', password: 'pw', username: 'reader' })
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('types RegisterData with an interface directly', { timeout: PROBE_TIMEOUT_MS }, () => {
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

  it('still takes a type alias', { timeout: PROBE_TIMEOUT_MS }, () => {
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

  it('leaves a caller without the second generic unchanged', { timeout: PROBE_TIMEOUT_MS }, () => {
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

  it(
    'the old Record<string, unknown> constraint rejects the same interface',
    { timeout: PROBE_TIMEOUT_MS },
    () => {
      const diagnostics = diagnosticsFor(`
interface CustomRegister {
  username: string
}

declare function legacyClient<TRegister extends Record<string, unknown>>(): TRegister

export const rejected = legacyClient<CustomRegister>()
`)

      expect(diagnostics.join('\n')).toContain('Index signature for type')
    },
  )

  it('still requires a custom field the interface declares', { timeout: PROBE_TIMEOUT_MS }, () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export const send = () => client.register({ email: 'reader@example.test', password: 'pw' })
`)

    expect(diagnostics.join('\n')).toContain('username')
  })

  it('still rejects a mistyped custom field', { timeout: PROBE_TIMEOUT_MS }, () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export const send = () =>
  client.register({ email: 'reader@example.test', password: 'pw', username: 42 })
`)

    expect(diagnostics.join('\n')).toContain('number')
  })

  it('still rejects a mistyped email or password', { timeout: PROBE_TIMEOUT_MS }, () => {
    const diagnostics = diagnosticsFor(`
${preamble}

export const send = () =>
  client.register({ email: 42, password: 'pw', username: 'reader' })
`)

    expect(diagnostics.join('\n')).toContain('number')
  })

  it(
    'rejects an interface that overrides a built-in field with a wrong type',
    { timeout: PROBE_TIMEOUT_MS },
    () => {
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
    },
  )

  it('rejects fields that are not an object', { timeout: PROBE_TIMEOUT_MS }, () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'
import type { UserProfile } from '../types.js'

export const client = createJWTAuthClient<UserProfile, string>({ storage: 'memory' })
`)

    expect(diagnostics.join('\n')).not.toEqual('')
  })
})

/**
 * Auto-tracking identifies a signed-in user whose profile has no `id`.
 *
 * `setupAutoTracking` used to require `user.id: string` on every auth event. An
 * app whose profile is `{ username, email, bio }` therefore could not pass its
 * typed client at all — the scaffold's `bonds/app-analytics.ts` stopped
 * compiling as soon as the app named its own profile. This suite fixes that at
 * the CONTRACT: the sources stay structurally typed, the identity is read from
 * the profile through `identifyUser`, and a profile with no `id` cannot be
 * wired without one — so `userId: undefined` never reaches a provider.
 *
 * The runtime cases drive the real listener the setup registers; the compile
 * probes go through the public `@molecule/app-auth` client type.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setupAutoTracking } from '../auto-tracking.js'
import { setProvider } from '../provider.js'

const { mockIdentify, mockPage, mockReset, mockTrack } = vi.hoisted(() => ({
  mockIdentify: vi.fn().mockResolvedValue(undefined),
  mockPage: vi.fn().mockResolvedValue(undefined),
  mockReset: vi.fn().mockResolvedValue(undefined),
  mockTrack: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  vi.clearAllMocks()
  setProvider({
    identify: mockIdentify,
    track: mockTrack,
    page: mockPage,
    reset: mockReset,
    flush: vi.fn().mockResolvedValue(undefined),
  })
})

/**
 * Compiles `source` as a file of this package (standalone options, no rootDir)
 * and returns the probe file's diagnostics.
 *
 * @param source - The TypeScript source to check.
 * @returns The diagnostic messages.
 */
function diagnosticsFor(source: string): string[] {
  const virtualFile = join(__dirname, '__typed-probe__.ts')
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  }
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
    .filter((diagnostic) => diagnostic.file?.fileName === virtualFile)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

/** The app's own profile: no `id` at all. */
interface SessionUser {
  username: string
  email: string
  bio: string
}

/** The auth event the client emits, in this app's profile shape. */
type SessionEvent =
  | { type: 'login' | 'register'; user: SessionUser }
  | { type: 'logout' }
  | { type: 'refresh' }
  | { type: 'error'; error: string }

/**
 * A structural auth client recording the listener the setup registers.
 *
 * @returns The client and a reader for the captured listener.
 */
function createAuthClient(): {
  client: { addEventListener(listener: (event: SessionEvent) => void): () => void }
  emit: (event: SessionEvent) => void
} {
  let listener: ((event: SessionEvent) => void) | undefined
  return {
    client: {
      addEventListener: (next) => {
        listener = next
        return () => {
          listener = undefined
        }
      },
    },
    emit: (event) => listener?.(event),
  }
}

describe('a profile with no id is identified through the app’s own field', () => {
  it('identifies login and register with the extractor, never an undefined userId', () => {
    const { client, emit } = createAuthClient()
    setupAutoTracking<SessionUser>({
      authClient: client,
      identifyUser: (user) => ({ userId: user.username, email: user.email }),
    })

    emit({ type: 'login', user: { username: 'ann', email: 'ann@example.com', bio: 'writes' } })

    expect(mockIdentify).toHaveBeenCalledWith({ userId: 'ann', email: 'ann@example.com' })
    expect(mockTrack).toHaveBeenCalledWith({
      name: 'auth.login',
      properties: { userId: 'ann' },
    })

    vi.clearAllMocks()
    emit({ type: 'register', user: { username: 'bo', email: 'bo@example.com', bio: '' } })

    expect(mockIdentify).toHaveBeenCalledWith({ userId: 'bo', email: 'bo@example.com' })
    expect(mockTrack).toHaveBeenCalledWith({
      name: 'auth.register',
      properties: { userId: 'bo' },
    })
  })

  it('tracks nothing for a session the extractor cannot identify', () => {
    const { client, emit } = createAuthClient()
    setupAutoTracking<SessionUser>({
      authClient: client,
      identifyUser: () => null,
    })

    emit({ type: 'login', user: { username: 'ann', email: 'ann@example.com', bio: '' } })

    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('keeps logout and error tracking unchanged', () => {
    const { client, emit } = createAuthClient()
    setupAutoTracking<SessionUser>({
      authClient: client,
      identifyUser: (user) => ({ userId: user.username }),
    })

    emit({ type: 'logout' })
    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.logout' })
    expect(mockReset).toHaveBeenCalled()

    vi.clearAllMocks()
    emit({ type: 'error', error: 'invalid credentials' })
    expect(mockTrack).toHaveBeenCalledWith({
      name: 'auth.error',
      properties: { error: 'invalid credentials' },
    })
  })

  it('keeps the default id/email/name extraction for the default profile', () => {
    let listener:
      ((event: { type: 'login'; user: { id: string; email?: string } }) => void) | undefined
    const client = {
      addEventListener: (
        next: (event: { type: 'login'; user: { id: string; email?: string } }) => void,
      ) => {
        listener = next
        return () => {
          listener = undefined
        }
      },
    }
    setupAutoTracking({
      authClient: client,
    })

    listener?.({ type: 'login', user: { id: 'acct_1', email: 'ann@example.com' } })

    expect(mockIdentify).toHaveBeenCalledWith({ userId: 'acct_1', email: 'ann@example.com' })
    expect(mockTrack).toHaveBeenCalledWith({
      name: 'auth.login',
      properties: { userId: 'acct_1' },
    })
  })
})

describe('the analytics contract refuses a custom profile with no identity', () => {
  const customClient = `
import type { AuthClientConfig } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { setupAutoTracking } from '../auto-tracking.js'

interface SessionUser {
  username: string
  email: string
  bio: string
}

const authClient = createJWTAuthClient<SessionUser>({})
`

  it('accepts the real no-id client with an identity extractor', () => {
    expect(
      diagnosticsFor(`${customClient}
export const cleanup = setupAutoTracking({
  authClient,
  identifyUser: (user) => ({ userId: user.username, email: user.email }),
})
`).join('\n'),
    ).toEqual('')
  })

  it('requires the extractor for a profile with no id', () => {
    const diagnostics = diagnosticsFor(`${customClient}
export const cleanup = setupAutoTracking({ authClient })
`)
    expect(diagnostics.join('\n')).toContain('identifyUser')
    expect(diagnostics.join('\n')).toContain('AutoTrackingOptions<SessionUser>')
  })

  it('keeps the default UserProfile client wiring with no extractor', () => {
    expect(
      diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'

import { setupAutoTracking } from '../auto-tracking.js'

const authClient = createJWTAuthClient({})
export const cleanup = setupAutoTracking({ authClient })
`).join('\n'),
    ).toEqual('')
  })

  it('rejects an extractor that invents an id the profile does not have', () => {
    const diagnostics = diagnosticsFor(`${customClient}
export const cleanup = setupAutoTracking({
  authClient,
  identifyUser: (user) => ({ userId: user.id }),
})
`)
    expect(diagnostics.join('\n')).toContain("Property 'id' does not exist")
  })

  it('rejects a non-string identity', () => {
    const diagnostics = diagnosticsFor(`${customClient}
export const cleanup = setupAutoTracking({
  authClient,
  identifyUser: (user) => ({ userId: user.username.length }),
})
`)
    expect(diagnostics.join('\n')).toContain('string')
  })
})

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
 * The runtime cases drive the real listener the setup registers; one of them
 * drives a REAL `@molecule/app-auth` client through login, register and logout,
 * so the events come from the client an app actually bonds. The compile probes
 * go through the public `@molecule/app-auth` client type.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'

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

  it('tracks the sign-in without identify when the extractor returns null', () => {
    // The public contract: `null` means "no identity", not "drop the event".
    // auth.login/auth.register are counted without an invented `userId`.
    const { client, emit } = createAuthClient()
    setupAutoTracking<SessionUser>({
      authClient: client,
      identifyUser: () => null,
    })

    emit({ type: 'login', user: { username: 'ann', email: 'ann@example.com', bio: '' } })

    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.login' })
    expect(mockTrack).not.toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ userId: expect.anything() }),
      }),
    )

    vi.clearAllMocks()
    emit({ type: 'register', user: { username: 'bo', email: 'bo@example.com', bio: '' } })

    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.register' })
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

describe('a real custom-profile auth client drives the auth analytics', () => {
  it('identifies and tracks login, register and logout from the bonded client', async () => {
    // The REAL client (not a double): its own events are what the analytics
    // wiring listens to, so a missing `id` has to be handled end to end.
    const fetchMock = vi.fn(async (url: string) => {
      const user = url.includes('register')
        ? { username: 'bo', email: 'bo@example.com', bio: '' }
        : { username: 'ann', email: 'ann@example.com', bio: 'writes' }
      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const authClient = createJWTAuthClient<SessionUser>({
      storage: 'memory',
      autoRefresh: false,
      mapAuthResponse: (data) => {
        const answer = data as { user: SessionUser }
        return { accessToken: 'token', user: answer.user }
      },
    })
    const cleanup = setupAutoTracking<SessionUser>({
      authClient,
      identifyUser: (user) => ({ userId: user.username, email: user.email }),
    })

    await authClient.login({ email: 'ann@example.com', password: 'pw' })
    expect(mockIdentify).toHaveBeenCalledWith({ userId: 'ann', email: 'ann@example.com' })
    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.login', properties: { userId: 'ann' } })

    vi.clearAllMocks()
    await authClient.register({ email: 'bo@example.com', password: 'pw' })
    expect(mockIdentify).toHaveBeenCalledWith({ userId: 'bo', email: 'bo@example.com' })
    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.register', properties: { userId: 'bo' } })

    vi.clearAllMocks()
    await authClient.logout()
    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.logout' })
    expect(mockReset).toHaveBeenCalled()

    cleanup()
    vi.unstubAllGlobals()
  })
})

describe('the real client keeps its sign-in events when the extractor returns null', () => {
  it('tracks login and register without identify, and still resets on logout', async () => {
    // A real client (not a double) and a recording provider: the public
    // contract for `identifyUser: () => null` is "skip identify, still track".
    const fetchMock = vi.fn(async (url: string) => {
      const user = url.includes('register')
        ? { username: 'bo', email: 'bo@example.com', bio: '' }
        : { username: 'ann', email: 'ann@example.com', bio: 'writes' }
      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const authClient = createJWTAuthClient<SessionUser>({
      storage: 'memory',
      autoRefresh: false,
      mapAuthResponse: (data) => {
        const answer = data as { user: SessionUser }
        return { accessToken: 'token', user: answer.user }
      },
    })
    const cleanup = setupAutoTracking<SessionUser>({
      authClient,
      identifyUser: () => null,
    })

    await authClient.login({ email: 'ann@example.com', password: 'pw' })
    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.login' })

    vi.clearAllMocks()
    await authClient.register({ email: 'bo@example.com', password: 'pw' })
    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.register' })

    vi.clearAllMocks()
    await authClient.logout()
    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.logout' })
    expect(mockReset).toHaveBeenCalled()

    // The cleanup still unsubscribes every listener.
    cleanup()
    vi.clearAllMocks()
    await authClient.login({ email: 'ann@example.com', password: 'pw' })
    expect(mockTrack).not.toHaveBeenCalled()
    expect(mockIdentify).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})

describe('the documented inline composition compiles against the real auth client', () => {
  const stubs = `
declare const getRouter: () => { subscribe(listener: (location: { pathname: string; search: string; hash: string }, action: string) => void): () => void }
declare const getHttp: () => { addErrorInterceptor(interceptor: (error: { message: string; status: number }) => { message: string; status: number }): () => void }
`

  it('accepts the verbatim Web-app example — an inline getClient()', () => {
    // Old-red: on the previous analytics this failed with
    // "Property 'identifyUser' is missing" because the inline call inferred
    // AuthClient<object>. The default overload pins AnalyticsAuthUser.
    expect(
      diagnosticsFor(`
import { getClient } from '@molecule/app-auth'

import { setupAutoTracking } from '../auto-tracking.js'
${stubs}
export const cleanup = setupAutoTracking({
  authClient: getClient(),
  router: getRouter(),
  httpClient: getHttp(),
})
`).join('\n'),
    ).toEqual('')
  })

  it('accepts an inline createJWTAuthClient()', () => {
    expect(
      diagnosticsFor(`
import { createJWTAuthClient } from '@molecule/app-auth'

import { setupAutoTracking } from '../auto-tracking.js'

export const cleanup = setupAutoTracking({ authClient: createJWTAuthClient() })
`).join('\n'),
    ).toEqual('')
  })

  it('keeps the variable form and the explicit profile argument working', () => {
    expect(
      diagnosticsFor(`
import { createJWTAuthClient, getClient, type UserProfile } from '@molecule/app-auth'

import { setupAutoTracking } from '../auto-tracking.js'

const authClient = getClient()
export const first = setupAutoTracking({ authClient })
export const second = setupAutoTracking({ authClient: getClient<UserProfile>() })
export const third = setupAutoTracking<UserProfile>({ authClient: createJWTAuthClient() })
`).join('\n'),
    ).toEqual('')
  })
})

describe('AutoTrackingOptions stays a mergeable interface', () => {
  it('accepts declaration augmentation and interface extension', () => {
    // Old-red: on the previous source this was a type alias, so augmenting it
    // failed with "Duplicate identifier 'AutoTrackingOptions'".
    expect(
      diagnosticsFor(`
import type { AutoTrackingOptions } from '../auto-tracking.js'

declare module '../auto-tracking.js' {
  interface AutoTrackingOptions {
    label?: string
  }
}

export const options: AutoTrackingOptions = { label: 'x' }

interface MyOptions extends AutoTrackingOptions {
  extra?: number
}

export const mine: MyOptions = { label: 'x', extra: 1 }
`).join('\n'),
    ).toEqual('')
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

  it('keeps the derived default options bag and forwarding wrapper compatible', () => {
    expect(
      diagnosticsFor(`
import { createJWTAuthClient, getClient } from '@molecule/app-auth'

import { setupAutoTracking } from '../auto-tracking.js'

type DefaultOptions = Parameters<typeof setupAutoTracking>[0]
const options: DefaultOptions = { authClient: createJWTAuthClient({}) }
export const cleanup = setupAutoTracking(options)

export function startTracking(options: DefaultOptions): () => void {
  return setupAutoTracking(options)
}
startTracking({ authClient: getClient() })
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

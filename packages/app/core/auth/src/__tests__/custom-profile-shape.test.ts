/**
 * An app's OWN object profile need not carry `id`.
 *
 * `createJWTAuthClient` and `AuthClientConfig` were constrained to
 * `UserProfile`, whose `id` is required — while the client never reads a field
 * of the profile it stores and returns. An API whose user is
 * `{ username, email, bio, image }` (no `id`) therefore could not use the
 * shared client as typed: the app had to fabricate an `id` from a mutable
 * username, or hand-write a client and profile store beside this one.
 *
 * The probes compile against the REAL source with the TypeScript API. The
 * known-bad control proves the old `extends UserProfile` constraint rejects
 * that profile; the other probes prove the fixed constraint accepts it and
 * still rejects primitive profiles, wrong mapper shapes and unknown profile
 * patch fields. The runtime cases prove the complete custom object survives
 * login, session restoration and a profile save unchanged — no field added,
 * dropped or renamed.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { AuthClientConfig, AuthResult } from '../types.js'

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

/**
 * The app types every probe shares: a profile with no `id` at all.
 *
 * @param body - The probe-specific source appended after the shared client.
 * @returns The complete probe source.
 */
const customProfileSource = (body = ''): string => `
import { createJWTAuthClient } from '../client.js'
import type { AuthClientConfig } from '../types.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

const config: AuthClientConfig<SessionUser> = {
  mapAuthResponse: (data) => {
    const { user } = data as { user: { token: string } & SessionUser }
    return {
      accessToken: user.token,
      user: { username: user.username, email: user.email, bio: user.bio, image: user.image },
    }
  },
}

export const client = createJWTAuthClient<SessionUser>(config)

${body}
`

describe('a custom object profile without id is a supported type', () => {
  it('accepts the no-id interface in createJWTAuthClient and AuthClientConfig', () => {
    expect(diagnosticsFor(customProfileSource()).join('\n')).toEqual('')
  })

  it('known-bad control: the old extends UserProfile constraint rejects it', () => {
    const diagnostics = diagnosticsFor(`
import type { UserProfile } from '../types.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

declare function legacyClient<T extends UserProfile = UserProfile>(): T

export const legacy = legacyClient<SessionUser>()
`)

    expect(diagnostics.join('\n')).toContain("Property 'id' is missing")
  })

  it('accepts the no-id interface through the bonded client accessors', () => {
    expect(
      diagnosticsFor(`
import { getClient } from '../provider.js'
import { getUser } from '../utilities.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

export const client = getClient<SessionUser>()
export const username: string | undefined = getUser<SessionUser>()?.username
`).join('\n'),
    ).toEqual('')

    const diagnostics = diagnosticsFor(`
import type { AuthClient, UserProfile } from '../types.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

declare function legacyGetClient<T extends UserProfile = UserProfile>(): AuthClient<T>

export const client = legacyGetClient<SessionUser>()
`)

    expect(diagnostics.join('\n')).toContain("Property 'id' is missing")
  })

  it('rejects a mapper that omits a required custom field', () => {
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

export const client = createJWTAuthClient<SessionUser>({
  mapAuthResponse: () => ({
    accessToken: 'token',
    user: { username: 'ann', email: 'ann@example.com', image: 'ann.png' },
  }),
})
`)

    expect(diagnostics.join('\n')).toContain('AuthResult<SessionUser>')
    expect(diagnostics.join('\n')).toContain('bio')
  })

  it('rejects a profile patch field the custom profile does not have', () => {
    const diagnostics = diagnosticsFor(
      customProfileSource("export const save = () => client.updateProfile({ nickname: 'ann' })"),
    )

    expect(diagnostics.join('\n')).toContain('nickname')
  })

  it('types the profile endpoint resolver with the custom profile', () => {
    expect(
      diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'
import type { AuthClientConfig } from '../types.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

const config: AuthClientConfig<SessionUser> = {
  profileEndpoint: (user) => '/people/' + encodeURIComponent(user.username),
}

export const client = createJWTAuthClient<SessionUser>(config)
`).join('\n'),
    ).toEqual('')

    expect(
      diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'
import type { AuthClientConfig } from '../types.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

const config: AuthClientConfig<SessionUser> = {
  profileEndpoint: (user) => '/people/' + encodeURIComponent(user.id),
}

export const client = createJWTAuthClient<SessionUser>(config)
`).join('\n'),
    ).toContain("Property 'id' does not exist")
  })

  it('types the profile body adapter with the custom profile', () => {
    expect(
      diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

export const client = createJWTAuthClient<SessionUser>({
  profileRequestBody: (data) => ({ user: { bio: data.bio } }),
})
`).join('\n'),
    ).toEqual('')

    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

export const client = createJWTAuthClient<SessionUser>({
  profileRequestBody: (data) => ({ user: { id: data.id } }),
})
`)

    expect(diagnostics.join('\n')).toContain("Property 'id' does not exist")
  })
})

describe('the default profile and invalid profile types are unchanged', () => {
  it('keeps getUser()?.id typed as string for the default UserProfile', () => {
    expect(
      diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'

const client = createJWTAuthClient({})

export const id: string = client.getUser()?.id ?? ''
`).join('\n'),
    ).toEqual('')

    expect(
      diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'

const client = createJWTAuthClient({})

export const wrong: number = client.getUser()!.id
`).join('\n'),
    ).toContain('number')
  })

  it('rejects primitive and null profiles in the factory and the config', () => {
    for (const profile of ['string', 'number', 'null']) {
      const factory = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'

export const client = createJWTAuthClient<${profile}>({})
`)
      expect(factory.join('\n'), profile).not.toEqual('')

      const config = diagnosticsFor(`
import type { AuthClientConfig } from '../types.js'

export const config: AuthClientConfig<${profile}> = {}
`)
      expect(config.join('\n'), profile).not.toEqual('')
    }
  })
})

/** The app's own profile: the wire fields, and no `id` at all. */
interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

/**
 * A JWT whose `exp` is `seconds` from now.
 *
 * @param seconds - Seconds until expiry.
 * @returns The token.
 */
const createJWT = (seconds: number): string =>
  [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })),
    btoa('mock-signature'),
  ].join('.')

/** The wire user the API answers with — its own token and profile fields. */
const wireUser = {
  token: createJWT(3600),
  username: 'ann',
  email: 'ann@example.com',
  bio: 'writes things',
  image: 'https://example.com/ann.png',
}

/** The complete profile the client must hand back — every wire field, no `id`. */
const sessionUser: SessionUser = {
  username: 'ann',
  email: 'ann@example.com',
  bio: 'writes things',
  image: 'https://example.com/ann.png',
}

/**
 * The wire-preserving adapter: keep every field the API answered with.
 *
 * @param data - The parsed API answer.
 * @returns The adapted auth result.
 */
const mapAuthResponse = (data: unknown): AuthResult<SessionUser> => {
  const answer = data as { user: typeof wireUser }
  const { token, ...wire } = answer.user
  return { accessToken: token, user: wire }
}

/**
 * A `StorageAdapter` over an object.
 *
 * @returns The adapter plus the backing store.
 */
const createMockStorage = (): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  store: Record<string, string>
} => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    store,
  }
}

/**
 * A fetch-shaped response for the client's reads.
 *
 * @param data - The JSON body.
 * @param status - The HTTP status.
 * @returns The response.
 */
const createMockResponse = <T>(data: T, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  })

/** The profile keys the client must preserve, in a stable order. */
const profileKeys = ['bio', 'email', 'image', 'username']

describe('the complete custom profile survives the client lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('login stores the complete custom object without adding id or aliasing username', async () => {
    const fetchMock = vi.fn(() => createMockResponse({ user: wireUser }))
    vi.stubGlobal('fetch', fetchMock)
    const storage = createMockStorage()
    const client = createJWTAuthClient<SessionUser>({ storage, mapAuthResponse })

    const result = await client.login({ email: 'ann@example.com', password: 'pw' })

    expect(result.user).toEqual(sessionUser)
    expect(client.getUser()).toEqual(sessionUser)
    expect(Object.keys(client.getUser()!).sort()).toEqual(profileKeys)
    expect(client.getUser()!.username).toBe('ann')
    expect(client.getUser()).not.toHaveProperty('id')
    expect(JSON.parse(storage.getItem('molecule:auth:user') ?? 'null')).toEqual(sessionUser)
  })

  it('restores the complete custom object and keeps its field types', async () => {
    const storage = createMockStorage()
    const first = createJWTAuthClient<SessionUser>({ storage, mapAuthResponse })
    first.setSession({ accessToken: createJWT(3600), user: sessionUser })

    const restored = createJWTAuthClient<SessionUser>({ storage, mapAuthResponse })
    await restored.initialize()

    expect(restored.isAuthenticated()).toBe(true)
    expect(restored.getUser()).toEqual(sessionUser)
    expect(Object.keys(restored.getUser()!).sort()).toEqual(profileKeys)
    expect(restored.getUser()!.image).toBe('https://example.com/ann.png')
    expect(restored.getUser()).not.toHaveProperty('id')
  })

  it('a configured profile save keeps every field and publishes the saved profile', async () => {
    const updatedWire = { ...wireUser, bio: 'updated bio' }
    const fetchMock = vi.fn(() => createMockResponse({ user: updatedWire }))
    vi.stubGlobal('fetch', fetchMock)
    const storage = createMockStorage()
    const config: AuthClientConfig<SessionUser> = {
      storage,
      mapAuthResponse,
      profileEndpoint: (user) => '/people/' + encodeURIComponent(user.username),
      profileUpdateMethod: 'PUT',
      profileRequestBody: (data) => ({ user: data }),
    }
    const client = createJWTAuthClient<SessionUser>(config)
    client.setSession({ accessToken: createJWT(3600), user: sessionUser })
    const listener = vi.fn()
    client.subscribe(listener)

    const updated = await client.updateProfile({ bio: 'updated bio' })

    expect(updated).toEqual({ ...sessionUser, bio: 'updated bio' })
    expect(Object.keys(updated).sort()).toEqual(profileKeys)
    expect(updated.username).toBe('ann')
    expect(updated).not.toHaveProperty('id')
    expect(client.getUser()).toEqual(updated)
    expect(listener.mock.calls.at(-1)?.[0]).toMatchObject({ user: updated })
    expect(JSON.parse(storage.getItem('molecule:auth:user') ?? 'null')).toEqual(updated)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/people/ann')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({ user: { bio: 'updated bio' } }),
    })
  })
})

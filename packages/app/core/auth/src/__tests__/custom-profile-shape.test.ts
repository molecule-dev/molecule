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
 * The probes compile against the REAL source with the TypeScript API. Each
 * acceptance probe is a POSITIVE control: it fails on the pre-fix source, where
 * `T` was constrained to `UserProfile` (verified against 82845d6c1 — see the
 * task report; a re-declaration of the old signature would prove nothing about
 * this source). The negative probes prove the default configuration still
 * requires `id: string`, that the profile is not inferred from the mapper, that
 * array/function/`Date` profiles are rejected, and that the listener contract
 * keeps the default `AuthEventListener` implementable.
 *
 * The runtime cases prove the complete custom object survives login, session
 * restoration and a profile save unchanged — no field added, dropped or renamed
 * — and that the bonded `login`/`register` utilities hand back that same real
 * profile, typed, with no synthetic id.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { unbondSingleton } from '@molecule/app-bond'

import { createJWTAuthClient } from '../index.js'
import { getClient, setClient } from '../provider.js'
import type { AuthClientConfig, AuthResult, StorageAdapter } from '../types.js'
import { login, register } from '../utilities.js'

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
    const { user: wire } = data as { user: { token: string } & SessionUser }
    const { token, ...profile } = wire
    return { accessToken: token, user: profile }
  },
}

export const client = createJWTAuthClient<SessionUser>(config)

${body}
`

describe('a custom object profile without id is a supported type', () => {
  it('accepts the no-id interface in createJWTAuthClient and AuthClientConfig', () => {
    expect(diagnosticsFor(customProfileSource()).join('\n')).toEqual('')
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
  })

  it('infers the profile from a config the caller annotated', () => {
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
  mapAuthResponse: (data) => {
    const { user: wire } = data as { user: { token: string } & SessionUser }
    const { token, ...profile } = wire
    return { accessToken: token, user: profile }
  },
}

// No type argument: the caller's own annotation supplies the profile.
export const client = createJWTAuthClient(config)
export const username: string | undefined = client.getUser()?.username
`).join('\n'),
    ).toEqual('')
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

    expect(diagnostics.join('\n')).toContain('AuthResult<NoInfer<SessionUser>>')
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

  it('does NOT take the profile from an untyped mapper', () => {
    // Before the profile was accepted at all, this failed on the constraint.
    // It must STILL fail: an untyped call keeps the default `UserProfile`, whose
    // `id: string` is the contract of the default configuration.
    const diagnostics = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'

export const client = createJWTAuthClient({
  mapAuthResponse: () => ({ accessToken: 'token', user: { username: 'ann' } }),
})
`)

    expect(diagnostics.join('\n')).toContain('AuthResult<NoInfer<UserProfile>>')
    expect(diagnostics.join('\n')).toContain('id')
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

  it('rejects array, function and Date profiles at every entrypoint', () => {
    for (const profile of ['string[]', 'readonly string[]', '() => void', 'Date']) {
      const factory = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'

export const client = createJWTAuthClient<${profile}>({})
`)
      expect(factory.join('\n'), profile).toContain(`Type '${profile}' does not satisfy`)

      const noArgument = diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'

export const client = createJWTAuthClient<${profile}>()
`)
      expect(noArgument.join('\n'), profile).not.toEqual('')

      const config = diagnosticsFor(`
import type { AuthClientConfig } from '../types.js'

export const config: AuthClientConfig<${profile}> = {}
`)
      expect(config.join('\n'), profile).toContain('must be a JSON object type of named fields')

      const accessor = diagnosticsFor(`
import { getClient } from '../provider.js'
import { getUser, login } from '../utilities.js'

export const typed = getUser<${profile}>()
export const client = getClient<${profile}>()
export const signedIn = login<${profile}>({ email: 'a@b.test', password: 'pw' })
`)
      expect(accessor.join('\n'), profile).toContain(`Type '${profile}' does not satisfy`)
    }
  })

  it('keeps named interfaces, type aliases and the empty object type accepted', () => {
    expect(
      diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'
import type { AuthClientConfig } from '../types.js'

interface NamedInterface {
  username: string
}

type TypeAlias = {
  accountNumber: number
}

interface Composite extends NamedInterface {
  email?: string
}

export const named = createJWTAuthClient<NamedInterface>({})
export const aliased = createJWTAuthClient<TypeAlias>({})
export const composite = createJWTAuthClient<Composite>({})
export const empty = createJWTAuthClient<{}>({})

export const namedConfig: AuthClientConfig<NamedInterface> = {}
export const aliasConfig: AuthClientConfig<TypeAlias> = {}
export const emptyConfig: AuthClientConfig<{}> = {}
`).join('\n'),
    ).toEqual('')
  })
})

describe('the listener contract', () => {
  it('reads the custom profile in a listener on a custom-profile client', () => {
    expect(
      diagnosticsFor(`
import { createJWTAuthClient } from '../client.js'
import type { AuthEvent } from '../types.js'

interface SessionUser {
  username: string
  email: string
}

const client = createJWTAuthClient<SessionUser>({})

client.addEventListener((event: AuthEvent<SessionUser>) => {
  if (event.type === 'login') {
    const username: string = event.user.username
    void username
  }
})
`).join('\n'),
    ).toEqual('')
  })

  it('keeps a client whose profile extends UserProfile implementable with the default listener', () => {
    expect(
      diagnosticsFor(`
import type { AuthClient, AuthEventListener, AuthState, UserProfile } from '../types.js'

interface MyUser extends UserProfile {
  username: string
}

// The shape an external bond package shipped before listeners were typed by the
// profile: a default (UserProfile) listener. It stays implementable.
export declare class LegacyClient implements AuthClient<MyUser> {
  addEventListener(listener: AuthEventListener): () => void
  getState(): AuthState<MyUser>
  isAuthenticated(): boolean
  getUser(): MyUser | null
  setUser(user: MyUser | null): void
  getAccessToken(): string | null
  setAccessToken(token: string | null): void
  setSession(session: { accessToken: string; user: MyUser }): void
  getRefreshToken(): string | null
  login(): Promise<{ user: MyUser }>
  logout(): Promise<void>
  register(): Promise<{ user: MyUser }>
  refresh(): Promise<{ user: MyUser }>
  requestPasswordReset(): Promise<void>
  confirmPasswordReset(): Promise<void>
  updateProfile(): Promise<MyUser>
  changePassword(): Promise<void>
  initialize(): Promise<void>
  subscribe(callback: (state: AuthState<MyUser>) => void): () => void
  onAuthChange(callback: (state: AuthState<MyUser>) => void): () => void
  destroy(): void
}

const listener: AuthEventListener = () => undefined
export const registration = (client: LegacyClient) => client.addEventListener(listener)
`).join('\n'),
    ).toEqual('')
  })

  it('rejects the default listener on a client whose profile has no id', () => {
    const diagnostics = diagnosticsFor(`
import type { AuthClient, AuthEventListener, AuthState } from '../types.js'

interface SessionUser {
  username: string
  email: string
}

// The default listener would claim an id these events do not carry.
export declare class LegacyClient implements AuthClient<SessionUser> {
  addEventListener(listener: AuthEventListener): () => void
  getState(): AuthState<SessionUser>
  isAuthenticated(): boolean
  getUser(): SessionUser | null
  setUser(user: SessionUser | null): void
  getAccessToken(): string | null
  setAccessToken(token: string | null): void
  setSession(session: { accessToken: string; user: SessionUser }): void
  getRefreshToken(): string | null
  login(): Promise<{ user: SessionUser }>
  logout(): Promise<void>
  register(): Promise<{ user: SessionUser }>
  refresh(): Promise<{ user: SessionUser }>
  requestPasswordReset(): Promise<void>
  confirmPasswordReset(): Promise<void>
  updateProfile(): Promise<SessionUser>
  changePassword(): Promise<void>
  initialize(): Promise<void>
  subscribe(callback: (state: AuthState<SessionUser>) => void): () => void
  onAuthChange(callback: (state: AuthState<SessionUser>) => void): () => void
  destroy(): void
}
`)

    expect(diagnostics.join('\n')).toContain('addEventListener')
  })
})

describe('the bonded utilities type the custom profile', () => {
  it('offers the profile as a type argument on login() and register()', () => {
    expect(
      diagnosticsFor(`
import { getClient, setClient } from '../provider.js'
import { login, register } from '../utilities.js'
import { createJWTAuthClient } from '../client.js'
import type { AuthResult } from '../types.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

setClient(createJWTAuthClient<SessionUser>({}))

export const client = getClient<SessionUser>()
export const signedIn: AuthResult<SessionUser> = await login<SessionUser>({
  email: 'ann@example.com',
  password: 'pw',
})
export const signedUp: AuthResult<SessionUser> = await register<
  { username: string },
  SessionUser
>({ email: 'ann@example.com', password: 'pw', username: 'ann' })
// The registration-extra fields stay the FIRST type argument.
export const legacyRegister = await register<{ username: string }>({
  email: 'ann@example.com',
  password: 'pw',
  username: 'ann',
})
`).join('\n'),
    ).toEqual('')
  })

  it('keeps the untyped utilities on the default profile', () => {
    expect(
      diagnosticsFor(`
import { login } from '../utilities.js'

export const signedIn = await login({ email: 'ann@example.com', password: 'pw' })
export const id: string = signedIn.user.id
`).join('\n'),
    ).toEqual('')

    const diagnostics = diagnosticsFor(`
import { login } from '../utilities.js'

export const signedIn = await login({ email: 'ann@example.com', password: 'pw' })
// The untyped call is still typed UserProfile: a custom field it does not
// declare is not readable without naming the profile.
export const username: string = signedIn.user.username
`)
    expect(diagnostics.join('\n')).toContain('username')
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
 * The wire-preserving adapter: keep every field the API answered with, and keep
 * the bearer token out of the cached profile.
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
const createMockStorage = (): StorageAdapter & { store: Record<string, string> } => {
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
    unbondSingleton('auth-client')
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

  it('the bonded login/register utilities hand back the real custom profile', async () => {
    // A REAL bonded client (the same instance `getClient()` resolves), not a
    // mock: the utilities are typed for the app's profile and return the profile
    // the API answered with — no `id` invented anywhere.
    const fetchMock = vi.fn(() => createMockResponse({ user: wireUser }))
    vi.stubGlobal('fetch', fetchMock)
    const storage = createMockStorage()
    setClient(createJWTAuthClient<SessionUser>({ storage, mapAuthResponse }))

    const signedIn: AuthResult<SessionUser> = await login<SessionUser>({
      email: 'ann@example.com',
      password: 'pw',
    })
    expect(signedIn.user).toEqual(sessionUser)
    expect(signedIn.user).not.toHaveProperty('id')
    expect(getClient<SessionUser>().getUser()).toEqual(sessionUser)

    const signedUp: AuthResult<SessionUser> = await register<{ username: string }, SessionUser>({
      email: 'bo@example.com',
      password: 'pw',
      username: 'bo',
    })
    expect(signedUp.user.username).toBe('ann')
    expect(signedUp.user).not.toHaveProperty('id')
    expect(fetchMock.mock.calls.map((call) => call[1]?.body)).toContain(
      JSON.stringify({ email: 'bo@example.com', password: 'pw', username: 'bo' }),
    )
  })

  it('an empty object profile is a JSON object that round-trips unchanged', async () => {
    // Why `{}` stays accepted: it is not an invalid form — it is a JSON object
    // with no fields, persisted and restored faithfully. Rejecting it would also
    // reject a structurally empty named interface, which the contract keeps.
    const storage = createMockStorage()
    const first = createJWTAuthClient<Record<never, never>>({ storage })
    first.setSession({ accessToken: createJWT(3600), user: {} })

    const restored = createJWTAuthClient<Record<never, never>>({ storage })
    await restored.initialize()

    expect(restored.isAuthenticated()).toBe(true)
    expect(restored.getUser()).toEqual({})
  })
})

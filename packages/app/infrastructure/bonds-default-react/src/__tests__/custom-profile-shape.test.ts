/**
 * The DEFAULT scaffold path must accept the profile shapes `@molecule/app-auth`
 * already supports.
 *
 * `createJWTAuthClient` and `AuthClientConfig` were relaxed to any object profile
 * (an API whose user is `{ username, email, bio, image }`, no `id`), but these
 * default wrappers kept `TUser extends UserProfile` — so the very helpers a
 * scaffolded app wires in `bonds/auth-default.ts` still rejected the profile the
 * factory beneath them accepts. Every probe here compiles through the PUBLIC
 * entrypoint (`@molecule/app-bonds-default-react`) and the three factories it
 * exports. The acceptance probes are POSITIVE controls: they fail on the pre-fix
 * wrappers (verified against 4363aa74c's parent), so a revert fails this suite.
 * The negative probes keep the untyped default (`UserProfile`, `id: string`) and
 * reject array/function/`Date` profiles.
 *
 * The runtime cases prove the complete custom object survives login, session
 * restoration and a profile save through the REAL default wiring (bonded client,
 * storage, subscribers), with no `id` added and no custom field dropped.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthClientConfig, AuthResult, StorageAdapter } from '@molecule/app-auth'
import { getClient } from '@molecule/app-auth'
import { unbondSingleton } from '@molecule/app-bond'
import { createFetchClient, setClient as setHttpClient } from '@molecule/app-http'

import {
  createDefaultAuthClient,
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../index.js'

/**
 * Compiles `source` as a file of this package and returns its diagnostics.
 *
 * Diagnostics are filtered to the probe file itself: the entrypoint pulls the
 * whole bond graph in, and a library's own diagnostics are not this probe's
 * subject.
 *
 * @param source - The TypeScript source to check.
 * @returns The diagnostic messages for the probe file.
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
    .filter((diagnostic) => !diagnostic.file || diagnostic.file.fileName === virtualFile)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

/**
 * The app profile every probe shares: the wire fields, and no `id` at all.
 *
 * @param body - The probe-specific source appended after the shared config.
 * @returns The complete probe source.
 */
const customProfileSource = (body = ''): string => `
import type { AuthClientConfig } from '@molecule/app-auth'

import {
  createDefaultAuthClient,
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../index.js'

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

${body}
`

describe('a no-id custom profile reaches every default wrapper', () => {
  it('accepts the no-id interface in all three public factories', () => {
    // POSITIVE control: these compile only on the fixed wrappers — against the
    // pre-fix `TUser extends UserProfile` they fail on the missing `id`.
    expect(
      diagnosticsFor(
        customProfileSource(`
export const plain = createDefaultAuthClient<SessionUser>(config)
export const synced = createDefaultAuthClientWithHttpSync<SessionUser>(config)
export const fetched = createDefaultAuthClientWithFetchClient<SessionUser>(config, {
  baseURL: '/api',
})

export const username: string | undefined = plain.authClient.getUser()?.username
export const image: string | undefined = synced.authClient.getUser()?.image
export const bio: string | undefined = fetched.authClient.getUser()?.bio
`),
      ).join('\n'),
    ).toEqual('')
  })

  it('does not infer the profile from a config the caller annotated', () => {
    // The annotation types the config; it does NOT supply the wrapper's type
    // argument. Naming the profile at the call is the one rule across all three
    // wrappers (1.8 inferred it from the config — the documented caller break).
    const diagnostics = diagnosticsFor(
      customProfileSource(`
export const { authClient } = createDefaultAuthClient(config)
export const username: string | undefined = authClient.getUser()?.username
`),
    )

    expect(diagnostics.join('\n')).toContain('AuthClientConfigOptions<UserProfile>')

    expect(
      diagnosticsFor(
        customProfileSource(`
export const { authClient } = createDefaultAuthClient<SessionUser>(config)
export const username: string | undefined = authClient.getUser()?.username
`),
      ).join('\n'),
    ).toEqual('')
  })

  it('does not infer an id-bearing profile from an annotated config (old-red)', () => {
    // The 1.8 wrapper inferred an id-bearing custom profile from the config
    // annotation; naming it at the call is the documented migration.
    const diagnostics = diagnosticsFor(`
import type { AuthClientConfig, UserProfile } from '@molecule/app-auth'

import { createDefaultAuthClient } from '../index.js'

interface ExistingUser extends UserProfile {
  username: string
}

const config: AuthClientConfig<ExistingUser> = {}
export const { authClient } = createDefaultAuthClient(config)
export const name: string | undefined = authClient.getUser()?.username
`)

    expect(diagnostics.join('\n')).toContain('AuthClientConfigOptions<UserProfile>')

    expect(
      diagnosticsFor(`
import type { AuthClientConfig, UserProfile } from '@molecule/app-auth'

import { createDefaultAuthClient } from '../index.js'

interface ExistingUser extends UserProfile {
  username: string
}

const config: AuthClientConfig<ExistingUser> = {}
export const { authClient } = createDefaultAuthClient<ExistingUser>(config)
export const name: string | undefined = authClient.getUser()?.username
`).join('\n'),
    ).toEqual('')
  })

  for (const [member, entry] of [
    ['shouldRestoreUser', `shouldRestoreUser: (user: SessionUser) => user.username !== 'guest'`],
    [
      'profileEndpoint',
      `profileEndpoint: (user: Readonly<SessionUser>) => '/people/' + encodeURIComponent(user.username)`,
    ],
    ['profileRequestBody', `profileRequestBody: (data: Partial<SessionUser>) => ({ user: data })`],
  ] as Array<[string, string]>) {
    it(`keeps UserProfile for an untyped ${member} callback in every wrapper (old-red)`, () => {
      // On the previous source each wrapper inferred SessionUser from the
      // callback parameter and silently dropped the default `id: string`.
      const diagnostics = diagnosticsFor(`
import {
  createDefaultAuthClient,
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../index.js'

interface SessionUser {
  username: string
  email: string
}

const plain = createDefaultAuthClient({ ${entry} })
const synced = createDefaultAuthClientWithHttpSync({ ${entry} })
const fetched = createDefaultAuthClientWithFetchClient({ ${entry} }, { baseURL: '/api' })

export const usernames: Array<string | undefined> = [
  plain.authClient.getUser()?.username,
  synced.authClient.getUser()?.username,
  fetched.authClient.getUser()?.username,
]
`)

      expect(diagnostics.join('\n'), member).toContain('UserProfile')
      expect(diagnostics.join('\n'), member).toContain('username')
    })

    it(`accepts the ${member} callback when the profile is named`, () => {
      expect(
        diagnosticsFor(`
import {
  createDefaultAuthClient,
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../index.js'

interface SessionUser {
  username: string
  email: string
}

export const plain = createDefaultAuthClient<SessionUser>({ ${entry} })
export const synced = createDefaultAuthClientWithHttpSync<SessionUser>({ ${entry} })
export const fetched = createDefaultAuthClientWithFetchClient<SessionUser>(
  { ${entry} },
  { baseURL: '/api' },
)
`).join('\n'),
      ).toEqual('')
    })
  }

  it('accepts any in every wrapper', () => {
    expect(
      diagnosticsFor(`
import {
  createDefaultAuthClient,
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../index.js'

export const plain = createDefaultAuthClient<any>({})
export const synced = createDefaultAuthClientWithHttpSync<any>({})
export const fetched = createDefaultAuthClientWithFetchClient<any>({}, { baseURL: '/api' })
`).join('\n'),
    ).toEqual('')
  })

  it('accepts generic forwarding that copies AuthProfileConstraint', () => {
    expect(
      diagnosticsFor(`
import type { AuthClientConfig, AuthProfileConstraint } from '@molecule/app-auth'

import { createDefaultAuthClient } from '../index.js'

export function make<T extends AuthProfileConstraint<T>>(config: AuthClientConfig<T>) {
  return createDefaultAuthClient<T>(config)
}
`).join('\n'),
    ).toEqual('')
  })

  it('does NOT take the profile from an untyped mapper', () => {
    // The wrappers keep the factory's strict default: an untyped call is
    // `UserProfile`, whose required `id: string` a no-id mapper does not satisfy.
    const diagnostics = diagnosticsFor(`
import { createDefaultAuthClient } from '../index.js'

export const { authClient } = createDefaultAuthClient({
  mapAuthResponse: () => ({ accessToken: 'token', user: { username: 'ann' } }),
})
`)

    expect(diagnostics.join('\n')).toContain('AuthResult<NoInfer<UserProfile>>')
    expect(diagnostics.join('\n')).toContain('id')
  })

  it('rejects array, function and Date profiles in every wrapper', () => {
    for (const profile of ['string[]', '() => void', 'Date']) {
      const diagnostics = diagnosticsFor(`
import {
  createDefaultAuthClient,
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../index.js'

export const plain = createDefaultAuthClient<${profile}>({})
export const synced = createDefaultAuthClientWithHttpSync<${profile}>({})
export const fetched = createDefaultAuthClientWithFetchClient<${profile}>({}, { baseURL: '/api' })
`)
      expect(diagnostics.join('\n'), profile).toContain(`Type '${profile}' does not satisfy`)
    }
  })

  it('rejects a union that contains an invalid member in every wrapper', () => {
    const unions = [
      'SessionUser | SessionUser[]',
      'UserProfile | Date',
      'UserProfile | (() => void)',
    ]

    for (const profile of unions) {
      const diagnostics = diagnosticsFor(`
import type { UserProfile } from '@molecule/app-auth'

import {
  createDefaultAuthClient,
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../index.js'

interface SessionUser {
  username: string
  email: string
}

export const plain = createDefaultAuthClient<${profile}>({})
export const synced = createDefaultAuthClientWithHttpSync<${profile}>({})
export const fetched = createDefaultAuthClientWithFetchClient<${profile}>({}, { baseURL: '/api' })
`)
      expect(diagnostics.join('\n'), profile).not.toEqual('')
    }
  }, 30_000)

  it('accepts a union of object profiles in every wrapper', () => {
    expect(
      diagnosticsFor(`
import {
  createDefaultAuthClient,
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../index.js'

interface Account {
  accountNumber: number
}

interface Contact {
  email: string
}

type Profile = Account | Contact

export const plain = createDefaultAuthClient<Profile>({})
export const synced = createDefaultAuthClientWithHttpSync<Profile>({})
export const fetched = createDefaultAuthClientWithFetchClient<Profile>({}, { baseURL: '/api' })
`).join('\n'),
    ).toEqual('')
  }, 30_000)

  it('keeps a custom identity field at its declared type', () => {
    expect(
      diagnosticsFor(`
import type { AuthClientConfig } from '@molecule/app-auth'

import { createDefaultAuthClient } from '../index.js'

interface Account {
  accountNumber: number
  displayName: string
}

const config: AuthClientConfig<Account> = {}
const { authClient } = createDefaultAuthClient<Account>(config)

export const accountNumber: number = authClient.getUser()!.accountNumber
`).join('\n'),
    ).toEqual('')

    expect(
      diagnosticsFor(`
import type { AuthClientConfig } from '@molecule/app-auth'

import { createDefaultAuthClient } from '../index.js'

interface Account {
  accountNumber: number
  displayName: string
}

const config: AuthClientConfig<Account> = {}
const { authClient } = createDefaultAuthClient<Account>(config)

export const wrong: string = authClient.getUser()!.accountNumber
`).join('\n'),
    ).toContain('number')
  })

  it('passes the registration fields through the wrappers', () => {
    expect(
      diagnosticsFor(
        customProfileSource(`
const { authClient } = createDefaultAuthClient<
  SessionUser,
  { username: string }
>(config)

export const register = () =>
  authClient.register({ username: 'ann', email: 'ann@example.com', password: 'pw' })
`),
      ).join('\n'),
    ).toEqual('')

    expect(
      diagnosticsFor(
        customProfileSource(`
const { authClient } = createDefaultAuthClient<SessionUser>(config)

export const register = () =>
  authClient.register({ handle: 'ann', email: 'ann@example.com', password: 'pw' })
`),
      ).join('\n'),
    ).toContain('handle')
  })

  it('rejects a mapper that omits a required custom field', () => {
    const diagnostics = diagnosticsFor(`
import { createDefaultAuthClient } from '../index.js'

interface SessionUser {
  username: string
  email: string
  bio: string
  image: string
}

export const { authClient } = createDefaultAuthClient<SessionUser>({
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
      customProfileSource(
        `export const save = () => createDefaultAuthClient<SessionUser>(config).authClient.updateProfile({ nickname: 'ann' })`,
      ),
    )

    expect(diagnostics.join('\n')).toContain('nickname')
  })
})

describe('the default profile is unchanged for unparameterized callers', () => {
  it('keeps getUser()?.id typed as string', () => {
    expect(
      diagnosticsFor(`
import { createDefaultAuthClient, createDefaultAuthClientWithHttpSync } from '../index.js'

const plain = createDefaultAuthClient({})
const synced = createDefaultAuthClientWithHttpSync({})

export const id: string = plain.authClient.getUser()?.id ?? ''
export const syncedId: string = synced.authClient.getUser()?.id ?? ''
`).join('\n'),
    ).toEqual('')

    expect(
      diagnosticsFor(`
import { createDefaultAuthClient } from '../index.js'

const { authClient } = createDefaultAuthClient({})

export const wrong: number = authClient.getUser()!.id
`).join('\n'),
    ).toContain('number')
  })

  it('rejects primitive and null profiles in every wrapper', () => {
    for (const profile of ['string', 'number', 'null']) {
      const factory = diagnosticsFor(`
import type { AuthClientConfig } from '@molecule/app-auth'

import {
  createDefaultAuthClient,
  createDefaultAuthClientWithFetchClient,
  createDefaultAuthClientWithHttpSync,
} from '../index.js'

export const plain = createDefaultAuthClient<${profile}>({})
export const synced = createDefaultAuthClientWithHttpSync<${profile}>({})
export const fetched = createDefaultAuthClientWithFetchClient<${profile}>({}, { baseURL: '/api' })

export const config: AuthClientConfig<${profile}> = {}
`)
      expect(factory.join('\n'), profile).not.toEqual('')
      expect(factory.length, profile).toBeGreaterThanOrEqual(4)
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
 * A fetch stub answering one JSON body.
 *
 * @param body - The body to answer with.
 * @returns The stub.
 */
const stubJsonFetch = (body: unknown) => {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** The profile keys the client must preserve, in a stable order. */
const profileKeys = ['bio', 'email', 'image', 'username']

afterEach(() => {
  vi.unstubAllGlobals()
  unbondSingleton('auth-client')
  unbondSingleton('http-client')
})

describe('the complete custom profile survives the real default wiring', () => {
  it('createDefaultAuthClient bonds the complete custom object with no id added', async () => {
    stubJsonFetch({ user: wireUser })
    const storage = createMockStorage()
    const config: AuthClientConfig<SessionUser> = { storage, mapAuthResponse }
    const { authClient, setupAuthDefault } = createDefaultAuthClient<SessionUser>(config)
    setupAuthDefault()

    const result = await authClient.login({ email: 'ann@example.com', password: 'pw' })

    expect(result.user).toEqual(sessionUser)
    expect(authClient.getUser()).toEqual(sessionUser)
    expect(Object.keys(authClient.getUser()!).sort()).toEqual(profileKeys)
    expect(authClient.getUser()).not.toHaveProperty('id')
    // The BONDED client is the same typed client — read back through the public accessor.
    expect(getClient<SessionUser>().getUser()).toEqual(sessionUser)
    expect(JSON.parse(storage.store['molecule:auth:user'] ?? 'null')).toEqual(sessionUser)
  })

  it('restores the complete custom object through a second default client', async () => {
    const storage = createMockStorage()
    const config: AuthClientConfig<SessionUser> = { storage, mapAuthResponse }

    const first = createDefaultAuthClient<SessionUser>(config)
    first.setupAuthDefault()
    first.authClient.setSession({ accessToken: createJWT(3600), user: sessionUser })

    const restored = createDefaultAuthClient<SessionUser>(config)
    restored.setupAuthDefault()
    await restored.authClient.initialize()

    expect(restored.authClient.isAuthenticated()).toBe(true)
    expect(restored.authClient.getUser()).toEqual(sessionUser)
    expect(Object.keys(restored.authClient.getUser()!).sort()).toEqual(profileKeys)
    expect(restored.authClient.getUser()!.image).toBe('https://example.com/ann.png')
    expect(restored.authClient.getUser()).not.toHaveProperty('id')
    // The restored session is a live session for ownership purposes: the same token is
    // what `getSessionRevision()` guards writes against, so an empty one would let a
    // stale save overwrite the restored profile.
    expect(restored.authClient.getAccessToken()).toBe(first.authClient.getAccessToken())
  })

  it('createDefaultAuthClientWithHttpSync keeps the profile and the bearer in step', async () => {
    const httpClient = createFetchClient({ baseURL: 'http://api.test' })
    setHttpClient(httpClient)
    stubJsonFetch({ user: wireUser })

    const storage = createMockStorage()
    const config: AuthClientConfig<SessionUser> = { storage, mapAuthResponse }
    const { authClient, setupAuthDefault } =
      createDefaultAuthClientWithHttpSync<SessionUser>(config)
    setupAuthDefault()

    const result = await authClient.login({ email: 'ann@example.com', password: 'pw' })

    expect(result.user).toEqual(sessionUser)
    expect(Object.keys(authClient.getUser()!).sort()).toEqual(profileKeys)
    expect(httpClient.getAuthToken()).toBe(wireUser.token)

    await authClient.logout()
    expect(httpClient.getAuthToken()).toBeNull()
  })

  it('createDefaultAuthClientWithFetchClient publishes a saved custom profile', async () => {
    const updatedWire = { ...wireUser, bio: 'updated bio' }
    const fetchMock = stubJsonFetch({ user: updatedWire })
    const storage = createMockStorage()
    const config: AuthClientConfig<SessionUser> = {
      storage,
      mapAuthResponse,
      profileEndpoint: (user) => '/people/' + encodeURIComponent(user.username),
      profileUpdateMethod: 'PUT',
      profileRequestBody: (data) => ({ user: data }),
    }
    const { authClient, setupAuthDefault } = createDefaultAuthClientWithFetchClient<SessionUser>(
      config,
      { baseURL: 'http://api.test' },
    )
    setupAuthDefault()
    authClient.setSession({ accessToken: createJWT(3600), user: sessionUser })
    const listener = vi.fn()
    authClient.subscribe(listener)

    const updated = await authClient.updateProfile({ bio: 'updated bio' })

    expect(updated).toEqual({ ...sessionUser, bio: 'updated bio' })
    expect(Object.keys(updated).sort()).toEqual(profileKeys)
    expect(updated).not.toHaveProperty('id')
    expect(authClient.getUser()).toEqual(updated)
    expect(listener.mock.calls.at(-1)?.[0]).toMatchObject({ user: updated })
    expect(JSON.parse(storage.store['molecule:auth:user'] ?? 'null')).toEqual(updated)
    expect(fetchMock.mock.calls[0][0]).toBe('/people/ann')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({ user: { bio: 'updated bio' } }),
    })
  })

  it('a save in flight cannot overwrite a session that replaced it, without an id', async () => {
    // Session ownership is keyed on the session revision, never on a profile field — so a
    // profile with no `id` must not lose the guarantee: a save that resolves after the
    // session was replaced answers with the saved profile but must not publish it.
    const otherUser: SessionUser = {
      username: 'bo',
      email: 'bo@example.com',
      bio: 'other user',
      image: 'https://example.com/bo.png',
    }
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const fetchMock = vi.fn(async () => {
      await held
      return new Response(JSON.stringify({ user: { ...wireUser, bio: 'stale save' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const storage = createMockStorage()
    const config: AuthClientConfig<SessionUser> = {
      storage,
      mapAuthResponse,
      profileEndpoint: (user) => '/people/' + encodeURIComponent(user.username),
      profileRequestBody: (data) => ({ user: data }),
    }
    const { authClient, setupAuthDefault } = createDefaultAuthClient<SessionUser>(config)
    setupAuthDefault()
    authClient.setSession({ accessToken: createJWT(3600), user: sessionUser })

    const saving = authClient.updateProfile({ bio: 'stale save' })
    await Promise.resolve()
    const otherToken = createJWT(7200)
    authClient.setSession({ accessToken: otherToken, user: otherUser })
    release()

    const answered = await saving

    expect(answered).toEqual({ ...sessionUser, bio: 'stale save' })
    expect(authClient.getUser()).toEqual(otherUser)
    expect(authClient.getAccessToken()).toBe(otherToken)
    expect(JSON.parse(storage.store['molecule:auth:user'] ?? 'null')).toEqual(otherUser)
  })
})

/**
 * The client's user generic reaches its CONFIG, so a typed mapper cannot omit
 * a field the app's pages read (xr-molecule-flash-m255).
 *
 * The deployed Conduit app mapped the wire user to
 * `{ id: username, name: username, avatar: image, email, bio, token }` and cast
 * it `as UserProfile`. The cast was necessary because `AuthClientConfig` was
 * not generic: `mapAuthResponse` returned `AuthResult<UserProfile>` whatever
 * `T` the factory named, so the compiler could not see that `username` and
 * `image` — which the navbar and profile pages read — were dropped. The
 * navbar's `user?.username` was `''`, so the signed-in controls never rendered
 * although login had succeeded.
 */
import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { AuthResult, UserProfile } from '../types.js'

/** The app's own profile: the wire fields plus the base identity fields. */
interface AppUser extends UserProfile {
  username: string
  image: string
}

/** The wire user a RealWorld-shaped API answers with (no `id`/`name`/`avatar`). */
const wireUser = {
  token: 'jwt-token',
  username: 'ann',
  email: 'ann@example.com',
  image: 'https://example.com/ann.png',
  bio: 'writes things',
}

/** The profile every path must end up with: wire fields KEPT, identity ADDED. */
const appUser: AppUser = {
  id: 'ann',
  username: 'ann',
  name: 'ann',
  email: 'ann@example.com',
  avatar: 'https://example.com/ann.png',
  image: 'https://example.com/ann.png',
  bio: 'writes things',
}

/**
 * The adapter the docs teach: spread the wire user so its own fields survive,
 * then add the base profile fields. Typed by the client's `T`, the compiler
 * checks the result against {@link AppUser}.
 *
 * @param data - The parsed API answer.
 * @returns The adapted auth result.
 */
const mapAuthResponse = (data: unknown): AuthResult<AppUser> => {
  const answer = data as { user: typeof wireUser }
  const { token, ...wire } = answer.user
  return {
    accessToken: token,
    user: { ...wire, id: wire.username, name: wire.username, avatar: wire.image },
  }
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

describe('a typed client preserves the app user fields through every path', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as { document?: unknown }).document
  })

  it('login stores the mapped custom fields', async () => {
    mockFetch.mockImplementationOnce(() => createMockResponse({ user: wireUser }))
    const storage = createMockStorage()
    const client = createJWTAuthClient<AppUser>({ storage, mapAuthResponse })

    const result = await client.login({ email: 'ann@example.com', password: 'pw' })

    expect(result.user).toEqual(appUser)
    expect(client.getUser()).toEqual(appUser)
    expect(client.getUser()?.username).toBe('ann')
    expect(client.getUser()?.image).toBe('https://example.com/ann.png')
    expect(JSON.parse(storage.getItem('molecule:auth:user') ?? 'null')).toEqual(appUser)
  })

  it('register stores the mapped custom fields', async () => {
    mockFetch.mockImplementationOnce(() => createMockResponse({ user: wireUser }))
    const storage = createMockStorage()
    const client = createJWTAuthClient<AppUser>({ storage, mapAuthResponse })

    const result = await client.register({
      email: 'ann@example.com',
      password: 'pw',
      name: 'ann',
    })

    expect(result.user).toEqual(appUser)
    expect(result.user.username).toBe('ann')
    expect(client.getState().user).toEqual(appUser)
    expect(JSON.parse(storage.getItem('molecule:auth:user') ?? 'null')).toEqual(appUser)
  })

  it('restore keeps the custom fields of the stored user', async () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient<AppUser>({ storage, mapAuthResponse })
    client.setAccessToken(createJWT(3600))
    client.setUser(appUser)

    await client.initialize()

    expect(client.isAuthenticated()).toBe(true)
    expect(client.getUser()).toEqual(appUser)
    expect(client.getUser()?.username).toBe('ann')
  })

  it('the cookie restore maps the wire user to the typed profile', async () => {
    ;(globalThis as { document?: { cookie: string } }).document = { cookie: 'mol_auth=1' }
    mockFetch.mockImplementationOnce(() => createMockResponse({ user: wireUser }))
    const storage = createMockStorage()
    const client = createJWTAuthClient<AppUser>({ storage, mapAuthResponse })

    await client.initialize()

    expect(client.getUser()).toEqual(appUser)
    expect(client.getUser()?.image).toBe('https://example.com/ann.png')
    expect(JSON.parse(storage.getItem('molecule:auth:user') ?? 'null')).toEqual(appUser)
  })

  it('updateProfile maps the answer and keeps the custom fields', async () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient<AppUser>({ storage, mapAuthResponse })
    client.setSession({ accessToken: createJWT(3600), user: appUser })
    mockFetch.mockImplementationOnce(() =>
      createMockResponse({ user: { ...wireUser, bio: 'updated bio' } }),
    )

    const updated = await client.updateProfile({ bio: 'updated bio' })

    expect(updated.bio).toBe('updated bio')
    expect(updated.username).toBe('ann')
    expect(updated.image).toBe('https://example.com/ann.png')
    expect(client.getUser()).toEqual(updated)
    expect(JSON.parse(storage.getItem('molecule:auth:user') ?? 'null')).toEqual(updated)
  })

  it('setSession keeps the custom fields of a caller-built profile', () => {
    const storage = createMockStorage()
    const client = createJWTAuthClient<AppUser>({ storage, mapAuthResponse })
    const said = vi.fn()
    client.subscribe(said)

    client.setSession({ accessToken: 'token', user: appUser })

    expect(client.isAuthenticated()).toBe(true)
    expect(client.getState().user).toEqual(appUser)
    expect(said.mock.calls[0][0]).toMatchObject({ authenticated: true, user: appUser })
  })
})

/**
 * Compiles `source` as if it were a file in this package, and returns the
 * diagnostics TypeScript reports for it.
 *
 * Shared by every type-level check in this file (the mapper's user shape and the
 * profile-update transport config).
 *
 * @param source - The TypeScript source to check.
 * @returns The flattened diagnostic messages.
 */
const diagnosticsFor = (source: string): string[] => {
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
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

/**
 * Type-level verification: the config's mapper is checked against the SAME
 * user type the factory returns. The bad source compiled cleanly before
 * `AuthClientConfig` was generic (the cast inside `mapResult` re-labelled the
 * mapper's `UserProfile` as `T`), so this test fails without the change.
 */
describe('a mapper missing a required custom field fails type checking', () => {
  const source = (mapperUser: string): string => `
import { createJWTAuthClient } from '../index.js'
import type { UserProfile } from '../types.js'

interface AppUser extends UserProfile {
  username: string
  image: string
}

export const client = createJWTAuthClient<AppUser>({
  mapAuthResponse: () => ({ accessToken: 'token', user: ${mapperUser} }),
})
`

  it('rejects a mapper whose user omits the custom required fields', () => {
    const diagnostics = diagnosticsFor(
      source("{ id: 'ann', email: 'ann@example.com', name: 'ann' }"),
    )

    expect(diagnostics.join('\n')).toContain('AuthResult<AppUser>')
    expect(diagnostics.join('\n')).toContain('username')
    expect(diagnostics.join('\n')).toContain('image')
  })

  it('accepts a mapper that keeps the custom fields', () => {
    expect(
      diagnosticsFor(
        source(
          "{ id: 'ann', email: 'ann@example.com', name: 'ann', username: 'ann', image: 'i.png' }",
        ),
      ),
    ).toEqual([])
  })
})

/**
 * Type-level verification of the profile-update transport config
 * (main-auth-2246): the body adapter receives the client's own user type, and
 * the method choice is the standard profile-update set. Both sources fail to
 * compile without the config fields, so this is the typed half of the fix that
 * lets a `PUT /api/user` + `{ user }` app keep the shared client.
 */
describe('the profile-update transport config is typed by the client user', () => {
  const source = (fields: string): string => `
import { createJWTAuthClient } from '../index.js'
import type { UserProfile } from '../types.js'

interface AppUser extends UserProfile {
  username: string
  image: string
}

export const client = createJWTAuthClient<AppUser>({ ${fields} })
`

  it('accepts a body adapter typed by the custom profile', () => {
    expect(
      diagnosticsFor(
        source(
          "profileUpdateMethod: 'PUT', profileRequestBody: (data) => ({ user: { username: data.username, image: data.image } })",
        ),
      ),
    ).toEqual([])
  })

  it('rejects a body adapter that reads a field the profile does not have', () => {
    const diagnostics = diagnosticsFor(
      source('profileRequestBody: (data) => ({ user: { nope: data.nope } })'),
    )

    expect(diagnostics.join('\n')).toContain("'nope'")
  })

  it('rejects a method outside the standard profile-update set', () => {
    const diagnostics = diagnosticsFor(source("profileUpdateMethod: 'DELETE'"))

    expect(diagnostics.join('\n')).toContain('DELETE')
  })
})

describe('profile endpoint resolver has the signed-in profile type', () => {
  const source = (field: string): string => `
import { createJWTAuthClient } from '../index.js'
import type { AuthClientConfig, UserProfile } from '../types.js'
interface Account extends UserProfile { slug: string }
const config: AuthClientConfig<Account> = { ${field} }
export const client = createJWTAuthClient<Account>(config)
`
  it('accepts a current-user keyed write route independently of the read route', () => {
    expect(
      diagnosticsFor(
        source(
          "currentUserEndpoint: '/viewer', profileEndpoint: (user) => '/members/' + encodeURIComponent(user.id)",
        ),
      ),
    ).toEqual([])
  })
  it('rejects an unknown profile property in the route resolver', () => {
    expect(diagnosticsFor(source('profileEndpoint: (user) => user.missing')).join('\n')).toContain(
      'missing',
    )
  })
  it('keeps explicitly different read and write string routes compatible', () => {
    expect(
      diagnosticsFor(
        source(
          "currentUserEndpoint: '/viewer', profileEndpoint: '/preferences', profileUpdateMethod: 'PUT'",
        ),
      ),
    ).toEqual([])
  })
})

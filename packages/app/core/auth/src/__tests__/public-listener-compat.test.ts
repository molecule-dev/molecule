/**
 * The PUBLIC listener contract, compiled through the package's exported dist.
 *
 * The regression this guards (P18-auth-inline-compat#existing-custom-listener-inference):
 * an existing, valid consumer — a `UserProfile` extension and an unannotated
 * inline listener — stopped compiling with TS7006 once `addEventListener` took
 * a union of listener types, because TypeScript does not contextually type an
 * arrow against a union. The gate below compiles that exact consumer against
 * the entry a consumer actually resolves (`package.json` → `dist/index.d.ts`),
 * never against a source-only helper.
 *
 * Two controls pin the contract change. The same consumer is compiled against
 * the published 1.8.1 listener contract, where it compiles, and against the
 * pre-fix union, where it reports TS7006 — so this test fails if the fix is
 * reverted, and it also proves the consumer was valid before the change. Those
 * contracts are fixtures of the public declarations; the gate is the dist
 * compile, not the fixtures.
 *
 * The dist must be current: CI builds before it tests (`npm run build` precedes
 * `npm test` in `.github/workflows/ci.yml`). A stale dist fails here with the
 * build command instead of silently passing on old output.
 */

import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** The package root (`src/__tests__` → package). */
const packageRoot = join(__dirname, '..', '..')

/** The declaration file a consumer of this package resolves. */
const publicEntry = join(packageRoot, 'dist', 'index.d.ts')

/** Every source file whose change must be rebuilt before this suite runs. */
const buildInputs = ['index.ts', 'client.ts', 'types.ts'].map((file) =>
  join(packageRoot, 'src', file),
)

/**
 * The exact consumer from the P18 probe, verbatim: an ordinary existing app
 * profile that extends `UserProfile`, and an inline listener with no annotation.
 */
const publicConsumer = `import {createJWTAuthClient, type UserProfile} from '@molecule/app-auth'
interface ExistingUser extends UserProfile { username: string }
const client=createJWTAuthClient<ExistingUser>();
client.addEventListener(event=>{if(event.type==='login')console.log(event.user.id)});
`

/**
 * The published 1.8.1 listener contract, reproduced from that commit
 * (`@molecule/app-auth@1.8.1`, core `791efbbf4`): `T` is constrained to
 * `UserProfile` and the listener is the non-generic default.
 */
const before5f10Contract = `export interface UserProfile {
  id: string
  email?: string
  name?: string
  avatar?: string
  roles?: string[]
  metadata?: Record<string, unknown>
}
export type AuthEvent =
  | { type: 'login'; user: UserProfile }
  | { type: 'logout' }
  | { type: 'register'; user: UserProfile }
  | { type: 'refresh' }
  | { type: 'error'; error: string }
export type AuthEventListener = (event: AuthEvent) => void
export interface AuthClient<T extends UserProfile = UserProfile> {
  addEventListener(listener: AuthEventListener): () => void
}
export declare const createJWTAuthClient: <T extends UserProfile = UserProfile>(
  config?: Record<string, unknown>,
) => AuthClient<T>
`

/**
 * The pre-fix contract the review found on `64b472082` (source
 * `aacbac34f`): `addEventListener` took a conditional UNION of listener types.
 */
const unionContract = `export interface UserProfile {
  id: string
  email?: string
  name?: string
  avatar?: string
  roles?: string[]
  metadata?: Record<string, unknown>
}
export type AuthEvent<T = UserProfile> =
  | { type: 'login'; user: T }
  | { type: 'logout' }
  | { type: 'register'; user: T }
  | { type: 'refresh' }
  | { type: 'error'; error: string }
export type AuthEventListener<T = UserProfile> = (event: AuthEvent<T>) => void
export interface AuthClient<T = UserProfile> {
  addEventListener(
    listener: [T] extends [UserProfile]
      ? AuthEventListener<T> | AuthEventListener<UserProfile>
      : AuthEventListener<T>,
  ): () => void
}
export declare const createJWTAuthClient: <T extends object = UserProfile>(
  config?: Record<string, unknown>,
) => AuthClient<T>
`

/**
 * Fails the suite when `dist` is missing or older than the source it documents.
 */
function assertDistIsCurrent(): void {
  if (!existsSync(publicEntry)) {
    throw new Error(
      `The public listener contract is compiled through ${publicEntry}, which does not exist. Run \`npm run build\` in packages/app/core/auth first.`,
    )
  }
  const entryMtime = statSync(publicEntry).mtimeMs
  const stale = buildInputs.filter((source) => statSync(source).mtimeMs > entryMtime)
  if (stale.length > 0) {
    throw new Error(
      `dist/index.d.ts is older than ${stale.map((file) => file.replace(`${packageRoot}/`, '')).join(', ')} — rebuild with \`npm run build\` in packages/app/core/auth before running this suite.`,
    )
  }
}

/**
 * The compiler options a consumer of this package compiles with.
 *
 * @returns The options for one probe program.
 */
function consumerOptions(): ts.CompilerOptions {
  return {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  }
}

/**
 * Compiles `source` as a module inside this package and returns the diagnostic
 * messages.
 *
 * With `contract` given, the probe's `@molecule/app-auth` import resolves to an
 * in-memory fixture of that public contract instead of the package; without it,
 * resolution goes through the real package entry (`package.json` exports).
 *
 * @param source - The TypeScript source to check.
 * @param contract - An optional in-memory `@molecule/app-auth` declaration.
 * @param name - A unique probe file name (the programs are independent).
 * @returns The diagnostic messages.
 */
function diagnosticsFor(source: string, contract?: string, name = 'probe'): string[] {
  const probePath = join(packageRoot, `__public_${name}__.ts`)
  const files = new Map<string, string>([[probePath, source]])
  const options = consumerOptions()
  if (contract !== undefined) {
    const fixturePath = join(packageRoot, `__public_${name}_contract__.d.ts`)
    files.set(fixturePath, contract)
    options.paths = { '@molecule/app-auth': [fixturePath] }
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = files.get(fileName)
    return source !== undefined
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  }
  host.fileExists = (fileName) => files.has(fileName) || fileExists(fileName)
  host.readFile = (fileName) => files.get(fileName) ?? readFile(fileName)
  const program = ts.createProgram([probePath], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .map(
      (diagnostic) =>
        `${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    )
}

/**
 * Source fragments shared by the cases below.
 */
const customIdProfile = `
import {
  createJWTAuthClient,
  type AuthEvent,
  type AuthEventListener,
  type UserProfile,
} from '@molecule/app-auth'

interface ExistingUser extends UserProfile {
  username: string
}

const client = createJWTAuthClient<ExistingUser>()
`

const customNoIdProfile = `
import { createJWTAuthClient, type AuthEvent, type AuthEventListener } from '@molecule/app-auth'

interface SessionUser {
  username: string
  email: string
}

const client = createJWTAuthClient<SessionUser>()
`

const fullClientStub = (profile: string): string => `
  getState(): AuthState<${profile}>
  isAuthenticated(): boolean
  getUser(): ${profile} | null
  setUser(user: ${profile} | null): void
  getAccessToken(): string | null
  setAccessToken(token: string | null): void
  setSession(session: { accessToken: string; user: ${profile} }): void
  getRefreshToken(): string | null
  login(): Promise<{ user: ${profile} }>
  logout(): Promise<void>
  register(): Promise<{ user: ${profile} }>
  refresh(): Promise<{ user: ${profile} }>
  requestPasswordReset(): Promise<void>
  confirmPasswordReset(): Promise<void>
  updateProfile(): Promise<${profile}>
  changePassword(): Promise<void>
  initialize(): Promise<void>
  subscribe(callback: (state: AuthState<${profile}>) => void): () => void
  onAuthChange(callback: (state: AuthState<${profile}>) => void): () => void
  destroy(): void
`

/**
 * An external provider class implementing `AuthClient`, with the listener
 * declaration under test.
 *
 * @param profile - The profile type the provider implements for.
 * @param listener - The `addEventListener` declaration.
 * @returns The probe source.
 */
const implementationProbe = (profile: string, listener: string): string => `
import type {
  AuthClient,
  AuthEventListener,
  AuthState,
  UserProfile,
} from '@molecule/app-auth'

${profile}

export declare class ProviderClient implements AuthClient<MyUser> {
  ${listener}
${fullClientStub('MyUser')}}
`

describe('the public listener contract compiles through the exported dist', () => {
  it('compiles the exact main consumer: a UserProfile extension and an unannotated listener', () => {
    assertDistIsCurrent()
    expect(diagnosticsFor(publicConsumer, undefined, 'consumer').join('\n')).toEqual('')
  })

  it('contextually types an inline listener on the inferred and explicit default profile', () => {
    assertDistIsCurrent()
    for (const [name, declaration] of [
      ['inferred', 'const client = createJWTAuthClient()'],
      ['explicit', 'const client = createJWTAuthClient<UserProfile>()'],
    ]) {
      expect(
        diagnosticsFor(
          `
import { createJWTAuthClient, type UserProfile } from '@molecule/app-auth'

${declaration}

client.addEventListener((event) => {
  if (event.type === 'login') {
    const id: string = event.user.id
    void id
  }
})
`,
          undefined,
          `default_${name}`,
        ).join('\n'),
        name,
      ).toEqual('')
    }
  })

  it('contextually types an inline listener on an id-bearing custom profile', () => {
    assertDistIsCurrent()
    expect(
      diagnosticsFor(
        `${customIdProfile}
client.addEventListener((event) => {
  if (event.type === 'login') {
    const id: string = event.user.id
    const username: string = event.user.username
    void id
    void username
  }
})
`,
        undefined,
        'custom_id_inline',
      ).join('\n'),
    ).toEqual('')
  })

  it('accepts a stored default listener on an id-bearing custom-profile client', () => {
    assertDistIsCurrent()
    expect(
      diagnosticsFor(
        `${customIdProfile}
const listener: AuthEventListener = (event) => {
  if (event.type === 'login') console.log(event.user.id)
}

client.addEventListener(listener)
`,
        undefined,
        'custom_id_stored',
      ).join('\n'),
    ).toEqual('')
  })

  it('types a listener on a custom profile with no id, annotated or inline', () => {
    assertDistIsCurrent()
    expect(
      diagnosticsFor(
        `${customNoIdProfile}
client.addEventListener((event: AuthEvent<SessionUser>) => {
  if (event.type === 'login') {
    const username: string = event.user.username
    void username
  }
})
`,
        undefined,
        'custom_no_id_typed',
      ).join('\n'),
    ).toEqual('')

    expect(
      diagnosticsFor(
        `${customNoIdProfile}
client.addEventListener((event) => {
  if (event.type === 'login') {
    const username: string = event.user.username
    void username
  }
})
`,
        undefined,
        'custom_no_id_inline',
      ).join('\n'),
    ).toEqual('')
  })

  it('accepts the profile-typed listener declaration of an external provider', () => {
    assertDistIsCurrent()
    for (const [name, profile] of [
      ['id', 'interface MyUser extends UserProfile { username: string }'],
      ['no_id', 'interface MyUser { username: string; email: string }'],
    ]) {
      expect(
        diagnosticsFor(
          implementationProbe(
            profile,
            'addEventListener(listener: AuthEventListener<MyUser>): () => void',
          ),
          undefined,
          `provider_${name}`,
        ).join('\n'),
        name,
      ).toEqual('')
    }
  })
})

describe('the public listener contract rejects unsound listeners', () => {
  it('rejects the default listener on a client whose profile has no id', () => {
    assertDistIsCurrent()
    const diagnostics = diagnosticsFor(
      `${customNoIdProfile}
const listener: AuthEventListener = (event) => {
  if (event.type === 'login') console.log(event.user.id)
}

client.addEventListener(listener)
`,
      undefined,
      'no_id_default',
    )
    expect(diagnostics.join('\n')).toContain('not assignable')
    expect(diagnostics.join('\n')).toContain('id')
  })

  it('rejects a login-only callback (the client emits more events)', () => {
    assertDistIsCurrent()
    expect(
      diagnosticsFor(
        `${customNoIdProfile}
client.addEventListener((event: { type: 'login'; user: SessionUser }) => {
  console.log(event.user.username)
})
`,
        undefined,
        'login_only',
      ).join('\n'),
    ).toContain('not assignable')
  })

  it('rejects a narrower-profile listener that claims fields the client cannot emit', () => {
    assertDistIsCurrent()
    const diagnostics = diagnosticsFor(
      `${customIdProfile}
interface OtherUser extends UserProfile {
  nickname: string
}

const listener = (event: AuthEvent<OtherUser>) => {
  if (event.type === 'login') console.log(event.user.nickname)
}

client.addEventListener(listener)
`,
      undefined,
      'narrower_profile',
    )
    expect(diagnostics.join('\n')).toContain('not assignable')
    expect(diagnostics.join('\n')).toContain('nickname')
  })

  it('rejects the pre-2.0 default-listener declaration on an external provider', () => {
    assertDistIsCurrent()
    expect(
      diagnosticsFor(
        implementationProbe(
          'interface MyUser extends UserProfile { username: string }',
          'addEventListener(listener: AuthEventListener): () => void',
        ),
        undefined,
        'provider_legacy',
      ).join('\n'),
    ).toContain('addEventListener')
  })
})

describe('the listener contract controls', () => {
  it('compiles the exact consumer against the published 1.8.1 contract', () => {
    // The consumer was valid before the change — this is what makes its break a
    // regression rather than a new-shape expectation.
    expect(diagnosticsFor(publicConsumer, before5f10Contract, 'control_181').join('\n')).toEqual('')
  })

  it('reports TS7006 against the pre-fix union contract', () => {
    // The old-red control: this suite detects the defect it was written for.
    const diagnostics = diagnosticsFor(publicConsumer, unionContract, 'control_union')
    expect(diagnostics.join('\n')).toContain("Parameter 'event' implicitly has an 'any' type")
    expect(diagnostics.join('\n')).toContain('7006')
  })
})

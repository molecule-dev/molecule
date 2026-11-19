/**
 * A scaffolded app that names its OWN profile still wires the default auth
 * bond, the shared auth functions and auth auto-tracking.
 *
 * The scaffold's `bonds/auth-default.ts` and `bonds/app-analytics.ts` are typed
 * by `UserProfile` until the app names its profile. When it does
 * (`createDefaultAuthClientWithFetchClient<SessionUser>` for an API user with no
 * `id`), the analytics wiring used to stop compiling: `setupAutoTracking`'s auth
 * source required `user.id: string`. This probe compiles the whole scaffold-shaped
 * chain — default auth bond → `provideMolecule`/`useAuth`/`useAuthClient` →
 * `useProfileForm` (identity from the profile) → `setupAutoTracking` with an
 * `identifyUser` extractor — through the public entrypoints, so a regression in
 * any of those contracts fails here.
 *
 * @module
 */

import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Compiles `source` as a `.ts` file of this package and returns the probe
 * file's diagnostics.
 *
 * @param source - The TypeScript source to check.
 * @returns The diagnostic messages.
 */
function diagnosticsFor(source: string): string[] {
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    experimentalDecorators: true,
    useDefineForClassFields: false,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  }
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
    .filter((diagnostic) => diagnostic.file?.fileName === virtualFile)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

/**
 * The scaffold-shaped wiring every probe starts from: a no-id profile, the
 * default auth factory, the analytics auto-tracking call and a profile form that
 * reads its identity from the profile.
 *
 * @param trailing - Probe-specific source appended at the end.
 * @returns The complete probe source.
 */
const scaffoldSource = (trailing = ''): string => `
import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-angular'
import type { AuthClientConfig } from '@molecule/app-auth'
import { setupAutoTracking } from '@molecule/app-analytics'

import { useAuth, useAuthClient } from '../hooks/use-auth.js'
import { useProfileForm } from '../hooks/use-profile-form.js'
import { provideMolecule } from '../providers.js'

interface SessionUser {
  username: string
  email: string
  bio: string
}

const config: AuthClientConfig<SessionUser> = {
  mapAuthResponse: (data) => {
    const { user: wire } = data as { user: { token: string } & SessionUser }
    const { token, ...profile } = wire
    return { accessToken: token, user: profile }
  },
}

const { authClient, setupAuthDefault } = createDefaultAuthClientWithFetchClient<SessionUser>(
  config,
  { baseURL: '/api' },
)

export const cleanup = setupAutoTracking({
  authClient,
  identifyUser: (user) => ({ userId: user.username, email: user.email }),
})

export class ProfilePage {
  readonly auth = useAuth<SessionUser>()
  readonly client = useAuthClient<SessionUser>()
  readonly form = useProfileForm<SessionUser, { bio: string }>({
    defaultValues: { bio: '' },
    getIdentity: (current) => current.username,
    toValues: (current) => ({ bio: current.bio }),
    toPatch: (changes) => changes,
  })

  readonly providers = provideMolecule({ auth: this.client })
  readonly wiring = setupAuthDefault

  read(): string | null {
    const { user, status } = this.auth
    if (status() !== 'authenticated' || !user()) return null
    return \`\${this.form.formProps.onSubmit.name}:\${this.client.getState().status}\`
  }
}

${trailing}
`

describe('the scaffold wiring accepts an app profile with no id', () => {
  it(
    'compiles the default auth bond, hooks, profile form and auto-tracking together',
    { timeout: 120_000 },
    () => {
      expect(diagnosticsFor(scaffoldSource()).join('\n')).toEqual('')
    },
  )

  it('requires the analytics identity extractor for that profile', { timeout: 120_000 }, () => {
    const diagnostics = diagnosticsFor(
      scaffoldSource().replace(
        `export const cleanup = setupAutoTracking({
  authClient,
  identifyUser: (user) => ({ userId: user.username, email: user.email }),
})`,
        'export const cleanup = setupAutoTracking({ authClient })',
      ),
    )

    expect(diagnostics.join('\n')).toContain('identifyUser')
  })

  it('rejects an id the profile does not have', { timeout: 120_000 }, () => {
    const diagnostics = diagnosticsFor(
      scaffoldSource().replace('userId: user.username', 'userId: user.id'),
    )

    expect(diagnostics.join('\n')).toContain("Property 'id' does not exist")
  })

  it(
    'rejects a profile form whose patch adds a field the profile lacks',
    { timeout: 120_000 },
    () => {
      const diagnostics = diagnosticsFor(
        scaffoldSource().replace(
          'toPatch: (changes) => changes',
          "toPatch: () => ({ nickname: 'x' })",
        ),
      )

      expect(diagnostics.join('\n')).toContain('nickname')
    },
  )
})

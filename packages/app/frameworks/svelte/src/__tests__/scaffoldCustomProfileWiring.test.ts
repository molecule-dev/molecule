/**
 * A scaffolded app that names its OWN profile still wires the default auth bond,
 * the shared auth hooks and auth auto-tracking — React's
 * `scaffoldCustomProfileWiring` case in the Svelte binding's shapes.
 *
 * The scaffold's `bonds/auth-default.ts` and `bonds/app-analytics.ts` are typed
 * by `UserProfile` until the app names its profile. When it does
 * (`createDefaultAuthClientWithFetchClient<SessionUser>` for an API user with no
 * `id`), the analytics wiring used to stop compiling: `setupAutoTracking`'s auth
 * source required `user.id: string`. This probe compiles the whole scaffold-shaped
 * chain — default auth bond → `useAuth`/`useAuthClient` → `useProfileForm`
 * (identity from the profile) → `setupAutoTracking` with an `identifyUser`
 * extractor — through the public entrypoints, so a regression in any of those
 * contracts fails here.
 *
 * @module
 */

import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** The last compiled program, so the next probe reuses its parsed dependencies. */
let previousProgram: ts.Program | undefined
/** Distinguishes probes: a reused root file name would replay the previous source. */
let probeCount = 0

/**
 * Compiles `source` as a `.ts` file of this package and returns the probe
 * file's diagnostics.
 *
 * @param source - The TypeScript source to check.
 * @returns The diagnostic messages.
 */
function diagnosticsFor(source: string): string[] {
  const virtualFile = join(__dirname, `__typed-probe-${probeCount++}__.ts`)
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
  const program = ts.createProgram({
    rootNames: [virtualFile],
    options,
    host,
    oldProgram: previousProgram,
  })
  previousProgram = program
  const probeFile = program.getSourceFile(virtualFile)
  if (!probeFile) return ['the probe source file was not created']
  // Only the probe file's own diagnostics matter; checking every dependency's
  // declaration file is much slower and `skipLibCheck` silences it anyway.
  return [
    ...program.getSyntacticDiagnostics(probeFile),
    ...program.getSemanticDiagnostics(probeFile),
  ]
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
import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-svelte'
import type { AuthClientConfig } from '@molecule/app-auth'
import { setupAutoTracking } from '@molecule/app-analytics'

import { useAuthClient } from '../context.js'
import { useAuth } from '../hooks/useAuth.js'
import { useProfileForm } from '../hooks/useProfileForm.js'

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

export function profilePage() {
  const { user, status } = useAuth<SessionUser>()
  const client = useAuthClient<SessionUser>()
  const form = useProfileForm<SessionUser, { bio: string }>({
    defaultValues: { bio: '' },
    getIdentity: (current) => current.username,
    toValues: (current) => ({ bio: current.bio }),
    toPatch: (changes) => changes,
  })

  return { user, status, client, form, setupAuthDefault }
}

${trailing}
`

describe('the scaffold wiring accepts an app profile with no id', () => {
  it('compiles the default auth bond, hooks, profile form and auto-tracking together', () => {
    expect(diagnosticsFor(scaffoldSource()).join('\n')).toEqual('')
  }, 180_000)

  it('requires the analytics identity extractor for that profile', () => {
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
  }, 180_000)

  it('rejects an id the profile does not have', () => {
    const diagnostics = diagnosticsFor(
      scaffoldSource().replace('userId: user.username', 'userId: user.id'),
    )

    expect(diagnostics.join('\n')).toContain("Property 'id' does not exist")
  }, 180_000)

  it('rejects a profile form whose patch adds a field the profile lacks', () => {
    const diagnostics = diagnosticsFor(
      scaffoldSource().replace(
        'toPatch: (changes) => changes',
        "toPatch: () => ({ nickname: 'x' })",
      ),
    )

    expect(diagnostics.join('\n')).toContain('nickname')
  }, 180_000)
})

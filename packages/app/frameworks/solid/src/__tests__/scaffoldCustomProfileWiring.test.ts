/**
 * A scaffolded Solid app that names its OWN profile still wires the default
 * auth bond, the shared auth primitives and auth auto-tracking.
 *
 * The scaffold's `bonds/auth-default.ts` and `bonds/app-analytics.ts` are typed
 * by `UserProfile` until the app names its profile. When it does
 * (`createDefaultAuthClientWithFetchClient<SessionUser>` for an API user with no
 * `id`), the analytics wiring used to stop compiling: `setupAutoTracking`'s auth
 * source required `user.id: string`. This probe compiles the whole
 * scaffold-shaped chain — default auth bond → `MoleculeProvider`/`useAuth`/
 * `useAuthClient` → `useProfileForm` (identity from the profile) →
 * `setupAutoTracking` with an `identifyUser` extractor — through the public
 * entrypoints, so a regression in any of those contracts fails here.
 *
 * Mirrors the React package's `scaffoldCustomProfileWiring.test.ts`.
 *
 * @module
 */

import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { createTypeCheck } from './typeCheck.js'

/** Compiles a TSX probe as a file of this package and returns the probe's own diagnostics. */
const diagnosticsFor = createTypeCheck(join(__dirname, '__typed-probe__.tsx'), {
  scriptKind: ts.ScriptKind.TSX,
  probeOnly: true,
})

/**
 * The scaffold-shaped wiring every probe starts from: a no-id profile, the
 * default auth factory, the analytics auto-tracking call and a profile form that
 * reads its identity from the profile.
 *
 * @param trailing - Probe-specific source appended at the end.
 * @returns The complete probe source.
 */
const scaffoldSource = (trailing = ''): string => `
import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-solid'
import type { AuthClientConfig } from '@molecule/app-auth'
import { setupAutoTracking } from '@molecule/app-analytics'

import { MoleculeProvider } from '../provider.jsx'
import { useAuth, useAuthClient } from '../primitives/auth.js'
import { useProfileForm } from '../primitives/react-forms.js'

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

export function ProfilePage() {
  const { user, status } = useAuth<SessionUser>()
  const client = useAuthClient<SessionUser>()
  const form = useProfileForm<SessionUser, { bio: string }>({
    defaultValues: { bio: '' },
    getIdentity: (current) => current.username,
    toValues: (current) => ({ bio: current.bio }),
    toPatch: (changes) => changes,
  })

  if (status() !== 'authenticated' || !user()) return null

  const bio = form.register('bio')

  return (
    <MoleculeProvider config={{ auth: client }}>
      <form onSubmit={form.formProps.onSubmit}>
        <input value={form.formState().values.bio} onInput={bio.onChange} />
      </form>
    </MoleculeProvider>
  )
}

${trailing}
`

describe('the scaffold wiring accepts an app profile with no id', () => {
  it('compiles the default auth bond, hooks, profile form and auto-tracking together', () => {
    expect(diagnosticsFor(scaffoldSource()).join('\n')).toEqual('')
  }, 240_000)

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
  }, 240_000)

  it('rejects an id the profile does not have', () => {
    const diagnostics = diagnosticsFor(
      scaffoldSource().replace('userId: user.username', 'userId: user.id'),
    )

    expect(diagnostics.join('\n')).toContain("Property 'id' does not exist")
  }, 240_000)

  it('rejects a profile form whose patch adds a field the profile lacks', () => {
    const diagnostics = diagnosticsFor(
      scaffoldSource().replace(
        'toPatch: (changes) => changes',
        "toPatch: () => ({ nickname: 'x' })",
      ),
    )

    expect(diagnostics.join('\n')).toContain('nickname')
  }, 240_000)
})

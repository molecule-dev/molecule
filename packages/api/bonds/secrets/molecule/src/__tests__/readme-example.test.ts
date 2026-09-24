/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to the
 * molecule.dev vault) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getRequired, resolveAll, setProvider } from '@molecule/api-secrets'

import { createMoleculeSecretsProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('pulls the requested secrets from the vault into process.env', async () => {
    vi.stubEnv('MOLECULE_VAULT_TOKEN', 'test-token')
    vi.stubEnv('MOLECULE_APP_ID', 'app_123')
    vi.stubEnv('MOLECULE_VAULT_URL', undefined)
    vi.stubEnv('DATABASE_URL', undefined)
    vi.stubEnv('STRIPE_SECRET_KEY', undefined)
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            DATABASE_URL: 'postgres://app@db.example.com/app',
            STRIPE_SECRET_KEY: 'test-key',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createMoleculeSecretsProvider({
        token: process.env.MOLECULE_VAULT_TOKEN,
        appId: process.env.MOLECULE_APP_ID,
      }),
    )

    await resolveAll(['DATABASE_URL', 'STRIPE_SECRET_KEY'])

    const stripeKey = await getRequired('STRIPE_SECRET_KEY')

    expect(process.env.DATABASE_URL).toBe('postgres://app@db.example.com/app')
    expect(stripeKey).toBe('test-key')
    // getRequired() is served from the per-key cache filled by resolveAll().
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe(
      'https://api.molecule.dev/v1/vault/secrets?keys=DATABASE_URL%2CSTRIPE_SECRET_KEY',
    )
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'X-Molecule-App-Id': 'app_123',
    })
  })
})

/**
 * Molecule managed-vault secrets provider.
 *
 * Fetches a single app's secrets from molecule.dev's managed, per-app encrypted
 * vault over HTTPS, caches them for a TTL, serves the last-good cache on
 * transient failure (stale-while-error), and only then falls back to
 * `process.env`. The bootstrap token + app id are the only secrets that live in
 * the environment; every other value arrives over the wire.
 *
 * It is also the seam through which credential brokering is delivered: a vault
 * response carrying a `<PROVIDER>_BASE_URL` value points an existing bond at the
 * molecule broker gateway with no app-code change. Brokering is a vault-value
 * decision — this provider passes values through verbatim.
 *
 * @see https://api.molecule.dev/v1/vault
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import type { SecretsProvider } from '@molecule/api-secrets'

import type { MoleculeSecretsProviderOptions } from './types.js'

const logger = getLogger()

const DEFAULT_VAULT_URL = 'https://api.molecule.dev/v1/vault'

/**
 * Creates a managed-vault secrets provider that fetches a single app's secrets
 * from molecule.dev's vault, caches them for the TTL, serves stale cache on
 * transient failure, and only then falls back to `process.env`.
 * @param options - Vault connection options. Falls back to `MOLECULE_*` env vars.
 * @returns A `SecretsProvider` with get/getMany/set/delete/isAvailable/syncToEnv backed by the molecule vault.
 */
export function createMoleculeSecretsProvider(
  options: MoleculeSecretsProviderOptions = {},
): SecretsProvider {
  const token = options.token ?? process.env.MOLECULE_VAULT_TOKEN
  const appId = options.appId ?? process.env.MOLECULE_APP_ID
  const vaultUrl = options.vaultUrl ?? process.env.MOLECULE_VAULT_URL ?? DEFAULT_VAULT_URL
  const cacheTtl = options.cacheTtl ?? 60000
  const staleWhileError = options.staleWhileError ?? true

  let secretsCache: Record<string, string> | null = null
  let cacheTime = 0

  /**
   * Builds the authenticated request headers for vault calls. Never logs the
   * token or any secret value.
   * @returns Headers including the bearer token and per-app scoping id.
   */
  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    if (appId) {
      headers['X-Molecule-App-Id'] = appId
    }
    return headers
  }

  /**
   * Fetches the app's secret map from the vault, using the in-memory cache when
   * within TTL. On failure, when `staleWhileError` is enabled and a last-good
   * cache exists, returns the stale cache (logged `warn`); otherwise rethrows so
   * callers can fall back to `process.env`.
   * @param keys - Optional subset of keys to request via `?keys=`.
   * @returns A record of secret key-value pairs scoped to this app.
   */
  async function fetchSecrets(keys?: string[]): Promise<Record<string, string>> {
    // Serve from cache while within TTL.
    if (secretsCache && Date.now() - cacheTime < cacheTtl) {
      return secretsCache
    }

    if (!token) {
      throw new Error(
        t('secrets.molecule.error.tokenNotConfigured', undefined, {
          defaultValue:
            'Molecule vault token not configured. Set MOLECULE_VAULT_TOKEN or pass token option.',
        }),
      )
    }

    const url = new URL(`${vaultUrl}/secrets`)
    if (keys && keys.length > 0) {
      url.searchParams.set('keys', keys.join(','))
    }

    try {
      const response = await fetch(url.toString(), {
        headers: buildHeaders(),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(
          t(
            'secrets.molecule.error.vaultError',
            { status: String(response.status), error },
            { defaultValue: `Molecule vault error: ${response.status} ${error}` },
          ),
        )
      }

      const data = (await response.json()) as Record<string, string>

      secretsCache = data
      cacheTime = Date.now()

      return data
    } catch (error) {
      // Stale-while-error: serve the last successful cache so a transient vault
      // blip does not brown out a running app. Only when there is no cache at
      // all do we let the error propagate to the process.env fallback.
      if (staleWhileError && secretsCache) {
        logger.warn('Molecule vault fetch failed, serving stale cache:', error)
        return secretsCache
      }
      throw error
    }
  }

  return {
    name: 'molecule',

    async get(key: string): Promise<string | undefined> {
      try {
        const secrets = await fetchSecrets()
        return secrets[key]
      } catch (error) {
        // No cache available — fall back to process.env.
        logger.warn('Molecule vault get() failed, falling back to process.env:', error)
        return process.env[key]
      }
    },

    async getMany(keys: string[]): Promise<Record<string, string | undefined>> {
      try {
        const secrets = await fetchSecrets(keys)
        const result: Record<string, string | undefined> = {}
        for (const key of keys) {
          result[key] = secrets[key]
        }
        return result
      } catch (error) {
        // No cache available — fall back to process.env.
        logger.warn('Molecule vault getMany() failed, falling back to process.env:', error)
        const result: Record<string, string | undefined> = {}
        for (const key of keys) {
          result[key] = process.env[key]
        }
        return result
      }
    },

    async set(key: string, value: string): Promise<void> {
      if (!token) {
        throw new Error(
          t('secrets.molecule.error.tokenNotConfigured', undefined, {
            defaultValue: 'Molecule vault token not configured',
          }),
        )
      }

      const response = await fetch(`${vaultUrl}/secrets/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: buildHeaders(),
        body: JSON.stringify({ value }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(
          t(
            'secrets.molecule.error.vaultError',
            { status: String(response.status), error },
            { defaultValue: `Molecule vault error: ${response.status} ${error}` },
          ),
        )
      }

      // Invalidate cache so the next read reflects the control-plane write.
      secretsCache = null
    },

    async delete(key: string): Promise<void> {
      if (!token) {
        throw new Error(
          t('secrets.molecule.error.tokenNotConfigured', undefined, {
            defaultValue: 'Molecule vault token not configured',
          }),
        )
      }

      const response = await fetch(`${vaultUrl}/secrets/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: buildHeaders(),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(
          t(
            'secrets.molecule.error.vaultError',
            { status: String(response.status), error },
            { defaultValue: `Molecule vault error: ${response.status} ${error}` },
          ),
        )
      }

      // Invalidate cache so the next read reflects the control-plane write.
      secretsCache = null
    },

    async isAvailable(): Promise<boolean> {
      if (!token) return false

      try {
        await fetchSecrets()
        return true
      } catch (_error) {
        // Availability probe — any failure means the vault is unreachable; returning
        // false is the correct contract. The actual error is surfaced by get/getMany.
        return false
      }
    },

    async syncToEnv(keys: string[]): Promise<void> {
      try {
        const secrets = await fetchSecrets(keys)
        for (const key of keys) {
          if (secrets[key] !== undefined) {
            // Broker seam: values (including `<PROVIDER>_BASE_URL` gateway
            // pointers) are written verbatim — never rewritten or inspected.
            process.env[key] = secrets[key]
          }
        }
      } catch (error) {
        logger.warn('Failed to sync secrets from Molecule vault:', error)
      }
    },
  }
}

/** Default provider instance, created from `MOLECULE_*` environment variables. */
export const provider: SecretsProvider = createMoleculeSecretsProvider()

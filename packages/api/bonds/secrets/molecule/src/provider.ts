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

  // Per-key TTL cache. Each requested key gets its OWN entry — the cache is NOT
  // a single "full map" blob. This is what stops a keyed getMany()/get(), whose
  // vault response only ever contains the requested subset, from poisoning
  // UNrequested keys to `undefined`: a key that is simply absent from this map
  // is a cache MISS (must fetch), never a cached `undefined`. An entry whose
  // `value` is `undefined` means the vault was asked for that key and
  // authoritatively does not have it (known-absent) — that is a HIT and is not
  // refetched until its TTL expires.
  const cache = new Map<string, { value: string | undefined; cachedAt: number }>()

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
   * Resolves the requested `keys` to their secret values, hitting the vault only
   * when at least one requested key is missing from the per-key cache or stale.
   * On a successful fetch, ONLY the requested keys are written to the cache (a
   * requested-but-absent key is cached as known-absent) — never any unrequested
   * key, so an unrelated getMany() can never poison a later get(). On failure,
   * when `staleWhileError` is enabled and at least one requested key has a cached
   * value, the stale cache is served (logged `warn`); otherwise the error is
   * rethrown so callers can fall back to `process.env`.
   * @param keys - The exact keys to resolve; the set is requested via `?keys=`.
   * @returns A record of the requested keys to their values (`undefined` if absent).
   */
  async function fetchSecrets(keys: string[]): Promise<Record<string, string | undefined>> {
    const now = Date.now()

    // Fast path: serve entirely from cache when EVERY requested key has a fresh
    // (within-TTL) entry. A single missing or stale key forces a refetch — a key
    // that was never fetched is a MISS, not a cached `undefined`.
    const allFresh =
      keys.length > 0 &&
      keys.every((key) => {
        const entry = cache.get(key)
        return entry !== undefined && now - entry.cachedAt < cacheTtl
      })
    if (allFresh) {
      const result: Record<string, string | undefined> = {}
      for (const key of keys) {
        result[key] = cache.get(key)!.value
      }
      return result
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
    if (keys.length > 0) {
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

      // Cache ONLY the keys we actually requested. The vault's response to a
      // keyed query contains just that subset, so writing anything else would be
      // guessing; and a requested key absent from `data` is authoritatively
      // known-absent — cache it as `undefined` so it isn't refetched within TTL,
      // but NEVER touch an unrequested key.
      const result: Record<string, string | undefined> = {}
      for (const key of keys) {
        const value = data[key]
        cache.set(key, { value, cachedAt: now })
        result[key] = value
      }
      return result
    } catch (error) {
      // Stale-while-error: serve the last-good cached values for the requested
      // keys so a transient vault blip does not brown out a running app. Only
      // when NO requested key has any cached value do we let the error propagate
      // to the caller's process.env fallback.
      if (staleWhileError && keys.some((key) => cache.has(key))) {
        logger.warn('Molecule vault fetch failed, serving stale cache:', error)
        const result: Record<string, string | undefined> = {}
        for (const key of keys) {
          result[key] = cache.get(key)?.value
        }
        return result
      }
      throw error
    }
  }

  return {
    name: 'molecule',

    async get(key: string): Promise<string | undefined> {
      try {
        // Scope the request to this one key so its cache entry is per-key —
        // a fresh entry for it is a HIT, its absence a MISS that refetches.
        const secrets = await fetchSecrets([key])
        return secrets[key]
      } catch (error) {
        // No cache available — fall back to process.env.
        logger.warn('Molecule vault get() failed, falling back to process.env:', error)
        return process.env[key]
      }
    },

    async getMany(keys: string[]): Promise<Record<string, string | undefined>> {
      try {
        // fetchSecrets already scopes its result (and its cache writes) to
        // exactly `keys`, so no unrequested key can be poisoned by this call.
        return await fetchSecrets(keys)
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
      cache.clear()
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
      cache.clear()
    },

    async isAvailable(): Promise<boolean> {
      if (!token) return false

      try {
        // Direct reachability probe — deliberately does NOT read or populate the
        // TTL cache, so a boot-time check always reflects the vault's live state.
        const response = await fetch(`${vaultUrl}/secrets`, {
          headers: buildHeaders(),
        })
        return response.ok
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
          const value = secrets[key]
          if (value !== undefined) {
            // Broker seam: values (including `<PROVIDER>_BASE_URL` gateway
            // pointers) are written verbatim — never rewritten or inspected.
            process.env[key] = value
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

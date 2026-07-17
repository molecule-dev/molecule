/**
 * Doppler secrets provider.
 *
 * Retrieves secrets from Doppler using their API or CLI.
 *
 * @see https://docs.doppler.com/docs/api
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

const logger = getLogger()

const DOPPLER_API_URL = 'https://api.doppler.com/v3'

/**
 * Options for doppler provider.
 */
export interface DopplerProviderOptions {
  /**
   * Doppler service token.
   * If not provided, reads from DOPPLER_TOKEN env var.
   */
  token?: string

  /**
   * Doppler project name.
   * Required if using a personal token instead of service token.
   */
  project?: string

  /**
   * Doppler config/environment name.
   * Required if using a personal token instead of service token.
   */
  config?: string

  /**
   * Cache TTL in milliseconds.
   * @default 60000 (1 minute)
   */
  cacheTtl?: number

  /**
   * When a Doppler fetch fails (missing/invalid token, network, non-2xx), whether
   * to fall back to `process.env` for reads (`get`/`getMany`).
   *
   * - `true` (**default**) — return the `process.env` value. Resilient (env is a
   *   legitimate secondary source, e.g. after `syncToEnv`), but the returned value
   *   may be STALE or WRONG relative to Doppler. The fallback is always logged at
   *   `error` severity so an outage/misconfig is visible — never silent.
   * - `false` — do NOT fall back; RE-THROW the Doppler error so callers get an
   *   explicit, hard failure instead of a possibly-wrong secret. Use this where a
   *   stale/wrong secret is worse than a hard failure.
   *
   * Defaults from the `DOPPLER_FALLBACK_TO_ENV` env var (set to `false`/`0`/`no`/`off`
   * to disable) when unset here, else `true`.
   */
  fallbackToEnv?: boolean
}

/**
 * Resolves the effective `fallbackToEnv` policy from an explicit option, then the
 * `DOPPLER_FALLBACK_TO_ENV` env var, defaulting to `true`.
 *
 * @param option - Explicit `fallbackToEnv` from provider options, if any.
 * @returns Whether reads should fall back to `process.env` on a Doppler failure.
 */
function resolveFallbackToEnv(option?: boolean): boolean {
  if (typeof option === 'boolean') return option
  const env = process.env.DOPPLER_FALLBACK_TO_ENV
  if (env === undefined) return true
  return !/^(false|0|no|off)$/i.test(env)
}

/**
 * Creates a Doppler secrets provider that fetches secrets from the Doppler API.
 * Caches secrets for the configured TTL. On a fetch failure, reads either fall
 * back to `process.env` (logged at `error` — default) or re-throw, per `fallbackToEnv`.
 * @param options - Doppler connection options (token, project, config, cache TTL, fallbackToEnv). Falls back to `DOPPLER_TOKEN` env var.
 * @returns A `SecretsProvider` with get/set/delete/syncToEnv backed by Doppler.
 */
export function createDopplerProvider(options: DopplerProviderOptions = {}): SecretsProvider {
  const token = options.token ?? process.env.DOPPLER_TOKEN
  const cacheTtl = options.cacheTtl ?? 60000
  const fallbackToEnv = resolveFallbackToEnv(options.fallbackToEnv)

  let secretsCache: Record<string, string> | null = null
  let cacheTime = 0

  /**
   * Fetches all secrets from the Doppler API, using the in-memory cache if within TTL.
   * @returns A record of secret key-value pairs.
   */
  async function fetchSecrets(): Promise<Record<string, string>> {
    // Check cache
    if (secretsCache && Date.now() - cacheTime < cacheTtl) {
      return secretsCache
    }

    if (!token) {
      throw new Error(
        t('secrets.doppler.error.tokenNotConfigured', undefined, {
          defaultValue: 'Doppler token not configured. Set DOPPLER_TOKEN or pass token option.',
        }),
      )
    }

    const url = new URL(`${DOPPLER_API_URL}/configs/config/secrets/download`)
    url.searchParams.set('format', 'json')

    if (options.project) {
      url.searchParams.set('project', options.project)
    }
    if (options.config) {
      url.searchParams.set('config', options.config)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(
        t(
          'secrets.doppler.error.apiError',
          { status: String(response.status), error },
          { defaultValue: `Doppler API error: ${response.status} ${error}` },
        ),
      )
    }

    const data = (await response.json()) as Record<string, string>

    // Cache the secrets
    secretsCache = data
    cacheTime = Date.now()

    return data
  }

  return {
    name: 'doppler',

    async get(key: string): Promise<string | undefined> {
      try {
        const secrets = await fetchSecrets()
        return secrets[key]
      } catch (error) {
        if (!fallbackToEnv) {
          // Fail closed: never serve a possibly-stale/wrong env value as if it
          // were the vault value. Log loudly and re-throw so the caller knows.
          logger.error(
            `Doppler get('${key}') failed and fallbackToEnv is disabled; re-throwing (no process.env fallback).`,
            { error },
          )
          throw error
        }
        // Fall back to process.env — NOT silent: the returned value may be stale
        // or wrong relative to Doppler, so surface the failure at error severity.
        logger.error(
          `Doppler get('${key}') failed; falling back to process.env (value may be stale or wrong).`,
          { error },
        )
        return process.env[key]
      }
    },

    async getMany(keys: string[]): Promise<Record<string, string | undefined>> {
      try {
        const secrets = await fetchSecrets()
        const result: Record<string, string | undefined> = {}
        for (const key of keys) {
          result[key] = secrets[key]
        }
        return result
      } catch (error) {
        if (!fallbackToEnv) {
          logger.error(
            `Doppler getMany([${keys.join(', ')}]) failed and fallbackToEnv is disabled; re-throwing (no process.env fallback).`,
            { error },
          )
          throw error
        }
        // Fall back to process.env — logged, not silent (see get()).
        logger.error(
          `Doppler getMany([${keys.join(', ')}]) failed; falling back to process.env (values may be stale or wrong).`,
          { error },
        )
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
          t('secrets.doppler.error.tokenNotConfigured', undefined, {
            defaultValue: 'Doppler token not configured',
          }),
        )
      }

      const url = new URL(`${DOPPLER_API_URL}/configs/config/secrets`)

      const body: Record<string, unknown> = {
        secrets: { [key]: value },
      }

      if (options.project) {
        body.project = options.project
      }
      if (options.config) {
        body.config = options.config
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(
          t(
            'secrets.doppler.error.apiError',
            { status: String(response.status), error },
            { defaultValue: `Doppler API error: ${response.status} ${error}` },
          ),
        )
      }

      // Invalidate cache
      secretsCache = null
    },

    async delete(key: string): Promise<void> {
      // Doppler doesn't have a direct delete - set to empty or use dashboard
      await this.set!(key, '')
    },

    async isAvailable(): Promise<boolean> {
      if (!token) return false

      try {
        await fetchSecrets()
        return true
      } catch (_error) {
        // Best-effort availability probe — a fetch failure just means Doppler is unavailable.
        return false
      }
    },

    async syncToEnv(keys: string[]): Promise<void> {
      try {
        const secrets = await fetchSecrets()
        for (const key of keys) {
          if (secrets[key] !== undefined) {
            process.env[key] = secrets[key]
          }
        }
      } catch (error) {
        logger.warn('Failed to sync secrets from Doppler:', error)
      }
    },
  }
}

/** Default Doppler provider instance, created with options from environment variables. */
export const provider: SecretsProvider = createDopplerProvider()

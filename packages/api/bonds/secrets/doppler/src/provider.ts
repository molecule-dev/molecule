/**
 * Doppler secrets provider.
 *
 * Retrieves secrets from Doppler using their API or CLI.
 *
 * @see https://docs.doppler.com/docs/api
 *
 * @module
 */

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
}

/**
 * Creates a Doppler secrets provider that fetches secrets from the Doppler API.
 * Caches secrets for the configured TTL. Falls back to `process.env` on API failure.
 * @param options - Doppler connection options (token, project, config, cache TTL). Falls back to `DOPPLER_TOKEN` env var.
 * @returns A `SecretsProvider` with get/set/delete/syncToEnv backed by Doppler.
 */
export function createDopplerProvider(options: DopplerProviderOptions = {}): SecretsProvider {
  const token = options.token ?? process.env.DOPPLER_TOKEN
  const cacheTtl = options.cacheTtl ?? 60000

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
        // Fall back to process.env if Doppler fails
        logger.warn('Doppler get() failed, falling back to process.env:', error)
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
        // Fall back to process.env
        logger.warn('Doppler getMany() failed, falling back to process.env:', error)
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
      } catch {
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

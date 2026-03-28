/**
 * Rate-limit provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-rate-limit-memory`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { RateLimitOptions, RateLimitProvider, RateLimitResult } from './types.js'

const BOND_TYPE = 'rate-limit'
expectBond(BOND_TYPE)

/**
 * Registers a rate-limit provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The rate-limit provider implementation to bond.
 */
export const setProvider = (provider: RateLimitProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded rate-limit provider, throwing if none is configured.
 *
 * @returns The bonded rate-limit provider.
 * @throws {Error} If no rate-limit provider has been bonded.
 */
export const getProvider = (): RateLimitProvider => {
  try {
    return bondRequire<RateLimitProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('rateLimit.error.noProvider', undefined, {
        defaultValue: 'Rate-limit provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a rate-limit provider is currently bonded.
 *
 * @returns `true` if a rate-limit provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Checks whether a request identified by `key` is within the rate limit
 * without consuming a token.
 *
 * @param key - Unique identifier for the rate limit bucket (e.g. IP, user ID).
 * @returns The current rate limit state for the key.
 * @throws {Error} If no rate-limit provider has been bonded.
 */
export const check = async (key: string): Promise<RateLimitResult> => {
  return getProvider().check(key)
}

/**
 * Consumes one or more tokens from the rate limit bucket.
 *
 * @param key - Unique identifier for the rate limit bucket.
 * @param cost - Number of tokens to consume (defaults to 1).
 * @returns The updated rate limit state after consumption.
 * @throws {Error} If no rate-limit provider has been bonded.
 */
export const consume = async (key: string, cost?: number): Promise<RateLimitResult> => {
  return getProvider().consume(key, cost)
}

/**
 * Resets the rate limit state for a given key.
 *
 * @param key - Unique identifier for the rate limit bucket to reset.
 * @returns A promise that resolves when the bucket has been reset.
 * @throws {Error} If no rate-limit provider has been bonded.
 */
export const reset = async (key: string): Promise<void> => {
  return getProvider().reset(key)
}

/**
 * Returns the number of remaining tokens for a given key.
 *
 * @param key - Unique identifier for the rate limit bucket.
 * @returns Number of remaining requests in the current window.
 * @throws {Error} If no rate-limit provider has been bonded.
 */
export const getRemaining = async (key: string): Promise<number> => {
  return getProvider().getRemaining(key)
}

/**
 * Applies new rate limit configuration to the bonded provider.
 *
 * @param options - The rate limit options to apply.
 * @throws {Error} If no rate-limit provider has been bonded.
 */
export const configure = (options: RateLimitOptions): void => {
  getProvider().configure(options)
}

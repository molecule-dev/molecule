/**
 * Structured limit-error helpers.
 *
 * When a tier limit is exceeded, handlers and middleware return a
 * `LimitErrorPayload` so the client can render a typed upgrade prompt
 * (current tier, current limit, next tier, upgraded limit, upgrade vs signup).
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

import { getProvider } from './provider.js'
import type { LimitErrorPayload, LimitType } from './types.js'

/** Options for building a limit error payload. */
export interface BuildLimitErrorOptions<TLimits = unknown> {
  /** Identifier for the limit that was hit (e.g. `'maxProjects'`). */
  limitType: LimitType

  /** The current user's tier category (e.g. `'free'`, `'anonymous'`). */
  category: string

  /** The numeric limit that was exceeded. */
  currentLimit: number

  /**
   * Optional accessor that maps the next-up tier's `limits` to the relevant
   * numeric value. When omitted, `upgradedLimit` is `null` and the upgrade
   * prompt simply names the next tier without a number.
   */
  resolveUpgradedLimit?: (nextLimits: TLimits) => number | null | undefined

  /** Seconds until the client should retry, when applicable. */
  retryAfter?: number

  /** Optional override for the localized error message. */
  message?: string
}

/**
 * Build a `LimitErrorPayload` describing a tier-limit violation.
 *
 * Reads the bonded entitlements registry to resolve the next-up category and
 * (optionally) the upgraded limit value. Anonymous users are flagged with
 * `requiresSignup: true` so the client can offer a sign-up prompt rather than
 * an upgrade prompt.
 *
 * @param options - The limit type, current tier category, current limit, and
 *   optional upgrade-limit resolver / retry-after / message override.
 * @returns A structured payload safe to send as a 429 / 403 response body.
 */
export const buildLimitError = <TLimits = unknown>(
  options: BuildLimitErrorOptions<TLimits>,
): LimitErrorPayload => {
  const { limitType, category, currentLimit, resolveUpgradedLimit, retryAfter, message } = options

  const registry = getProvider<TLimits>()
  const nextCategory = registry.getNextCategory(category)
  const requiresSignup = category === 'anonymous'

  let upgradedLimit: number | null = null
  if (nextCategory && resolveUpgradedLimit) {
    const nextTier = registry.getAllTiers().find((tier) => tier.category === nextCategory)
    if (nextTier) {
      const value = resolveUpgradedLimit(nextTier.limits)
      if (typeof value === 'number') upgradedLimit = value
    }
  }

  const localizedMessage =
    message ??
    t(
      'entitlements.error.limitExceeded',
      { limitType, currentLimit, currentTier: category },
      {
        defaultValue: requiresSignup
          ? `Limit reached (${currentLimit}). Create a free account for more.`
          : `Limit reached (${currentLimit}). Upgrade your plan for more.`,
      },
    )

  return {
    error: localizedMessage,
    limitType,
    currentLimit,
    upgradedLimit,
    currentTier: category,
    upgradeTier: nextCategory,
    requiresSignup,
    ...(retryAfter != null ? { retryAfter } : {}),
  }
}

import type { useTranslation } from '@molecule/app-solid'

import type { PricingTierPrice } from './types.js'

/**
 * The translate function this package consumes — the `t` returned by the
 * host app's `useTranslation()`. Declared structurally so the label helpers
 * stay testable without a Solid app.
 */
export type BillingTranslate = ReturnType<typeof useTranslation>['t']

/** A billing cadence a tier price can carry. */
export type BillingPeriod = PricingTierPrice['period']

/**
 * Localized label for a billing period (e.g. "per month"). One literal
 * `t()` call per period so the i18n parity gate can verify every key the
 * call can produce exists in the companion locale bond.
 *
 * @param period - The tier price's billing cadence.
 * @param t - The host app's translate function.
 * @returns The translated period label.
 */
export function billingPeriodLabel(period: BillingPeriod, t: BillingTranslate): string {
  switch (period) {
    case 'month':
      return t('billing.pricing.period.month', undefined, { defaultValue: 'per month' })
    case 'year':
      return t('billing.pricing.period.year', undefined, { defaultValue: 'per year' })
  }
}

/**
 * Localized "billed" line for a tier price (e.g. "Billed monthly"). One
 * literal `t()` call per period so the i18n parity gate can verify every
 * key the call can produce exists in the companion locale bond.
 *
 * @param period - The tier price's billing cadence.
 * @param t - The host app's translate function.
 * @returns The translated billed line.
 */
export function billingBilledLabel(period: BillingPeriod, t: BillingTranslate): string {
  switch (period) {
    case 'month':
      return t('billing.pricing.billed.month', undefined, { defaultValue: 'Billed monthly' })
    case 'year':
      return t('billing.pricing.billed.year', undefined, { defaultValue: 'Billed annually' })
  }
}

/**
 * The English label a default limit row renders for a limits key the locale
 * bond does not carry: `maxProjects` → `Max projects`, `can_invite` →
 * `Can invite`. Also the `defaultValue` of every `billing.pricing.limit.*`
 * lookup.
 *
 * @param key - The limits object's key (camelCase or snake_case).
 * @returns The spaced, sentence-cased label.
 */
export function humanizeLimitKey(key: string): string {
  const spaced = key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * Localized label for a tier limit's key (e.g. `maxProjects` → "Max
 * projects"). The limit keys are the host app's own data, so the translation
 * key is built at runtime — `billing.pricing.limit.<key>` — and molecule's
 * i18n parity gate treats that dynamic prefix as owning every
 * `billing.pricing.limit.*` key the companion bond carries. A key the bond
 * does not carry renders the humanized English fallback, so an app's own
 * limits stay readable in every locale.
 *
 * @param key - The limits object's key (camelCase or snake_case).
 * @param t - The host app's translate function.
 * @returns The translated label, or the humanized English fallback.
 */
export function billingLimitLabel(key: string, t: BillingTranslate): string {
  return t(`billing.pricing.limit.${key}`, undefined, { defaultValue: humanizeLimitKey(key) })
}

/**
 * Display string for a tier limit's value: booleans as a check or a dash,
 * numbers below 999,999 through `toLocaleString`, a number at or above it as
 * the localized "Unlimited" sentinel, strings as written, and any other
 * value as JSON (or its string form when JSON cannot represent it).
 *
 * @param value - The limit's value.
 * @param t - The host app's translate function.
 * @returns The display string.
 */
export function billingLimitValue(value: unknown, t: BillingTranslate): string {
  if (typeof value === 'number' && value >= 999_999)
    return t('billing.pricing.unlimited', undefined, { defaultValue: 'Unlimited' })
  if (typeof value === 'boolean') return value ? '✓' : '—'
  if (typeof value === 'number') return value.toLocaleString()
  if (value == null) return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch (_error) {
    // JSON.stringify can throw on circular references; String() is always safe.
    return String(value)
  }
}

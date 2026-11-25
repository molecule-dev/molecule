import type { ReactNode } from 'react'
import { useState } from 'react'

import {
  type PricingTierEntry,
  type PricingTierPrice,
  usePricingTiers,
  useStartCheckout,
} from '@molecule/app-billing-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

/**
 * Billing period selector — currently `'month'` or `'year'`. Mirrors the
 * upstream `PricingTierPrice['period']` literal for type-safety.
 */
export type PricingPagePeriod = PricingTierPrice['period']

/** Props for `<PricingPage />`. */
export interface PricingPageProps<TLimits = unknown> {
  /**
   * Optional pre-fetched tiers. When omitted the component fetches them
   * via `usePricingTiers()` (which calls `GET /api/billing/tiers`).
   */
  tiers?: PricingTierEntry<TLimits>[]

  /**
   * Optional override for the checkout handler. The default posts to
   * `/api/billing/checkout` via `useStartCheckout()` and redirects the
   * browser to the returned `checkoutUrl`. Custom apps can pass a
   * function that performs Stripe checkout via a different transport,
   * navigates within a router, etc.
   */
  onCheckout?: (tier: PricingTierEntry<TLimits>, price: PricingTierPrice) => void | Promise<void>

  /** When true (default), renders a monthly/yearly toggle. */
  showPeriodToggle?: boolean

  /** Default billing period for the toggle. Defaults to `'month'`. */
  defaultPeriod?: PricingPagePeriod

  /**
   * Optional render function for the tier-specific limits block. When
   * omitted, `limits` are rendered as a `<dl>` of key-value pairs.
   */
  renderLimits?: (limits: TLimits) => ReactNode

  /**
   * Optional translation key for the page heading. Defaults to
   * `'pricingPage.heading'`.
   */
  headingKey?: string

  /** Optional English fallback for the heading. */
  headingDefault?: string

  /** Optional className applied to the outer wrapper. */
  className?: string
}

/**
 * Drop-in pricing page. Renders one card per tier from `tiers` (or
 * `usePricingTiers()` if not supplied), with an optional monthly /
 * yearly toggle and a Stripe Checkout CTA per card.
 *
 * @template TLimits - Application-specific tier-limits shape.
 * @param props - Component props (see `PricingPageProps`).
 * @returns The rendered pricing page.
 */
export function PricingPage<TLimits = unknown>(
  props: PricingPageProps<TLimits>,
): React.ReactElement {
  const {
    tiers: providedTiers,
    onCheckout,
    showPeriodToggle = true,
    defaultPeriod = 'month',
    renderLimits,
    headingKey = 'pricingPage.heading',
    headingDefault = 'Choose your plan',
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()
  const fetched = usePricingTiers<TLimits>()
  const { start, loading: starting, error: startError } = useStartCheckout()
  const [period, setPeriod] = useState<PricingPagePeriod>(defaultPeriod)

  const usingFetched = !providedTiers
  const tiers: PricingTierEntry<TLimits>[] | null = providedTiers ?? fetched.data?.data ?? null

  if (usingFetched && fetched.loading && !tiers) {
    return (
      <Box as="section" className={className} data-mol-id="pricing-page-loading">
        <Text as="p">
          {t('pricingPage.loading', undefined, { defaultValue: 'Loading plans…' })}
        </Text>
      </Box>
    )
  }

  if (usingFetched && (fetched.error || !tiers)) {
    return (
      <Box as="section" className={className} data-mol-id="pricing-page-error">
        <Text as="p" className={cm.formError} role="alert">
          {t('pricingPage.error', undefined, {
            defaultValue: 'Could not load pricing. Try again later.',
          })}
        </Text>
      </Box>
    )
  }

  const renderedTiers = tiers ?? []

  /**
   * Internal default checkout handler — posts to `/api/billing/checkout`
   * and either navigates to `checkoutUrl` or reloads on in-place update.
   *
   * @param _tier - The tier the user selected.
   * @param price - The selected price for that tier.
   */
  const handleCheckout = async (
    _tier: PricingTierEntry<TLimits>,
    price: PricingTierPrice,
  ): Promise<void> => {
    if (!price.stripePriceId) return
    if (onCheckout) {
      await onCheckout(_tier, price)
      return
    }
    const response = await start(price.stripePriceId)
    if (response?.checkoutUrl && typeof window !== 'undefined') {
      window.location.assign(response.checkoutUrl)
    } else if (response?.updated && typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const hasYearly = renderedTiers.some((tier) => tier.prices.some((p) => p.period === 'year'))

  return (
    <Box as="section" className={className} data-mol-id="pricing-page">
      <Box as="header" className={cm.cardHeader}>
        <Text as="h1" className={cm.cardTitle}>
          {t(headingKey, undefined, { defaultValue: headingDefault })}
        </Text>
      </Box>

      {showPeriodToggle && hasYearly && (
        <Box
          as="div"
          className={cm.flex({ direction: 'row', gap: 'sm', justify: 'center' })}
          data-mol-id="pricing-page-period-toggle"
          role="tablist"
          aria-label={t('pricingPage.periodToggle.label', undefined, {
            defaultValue: 'Billing period',
          })}
        >
          <Pressable
            as="button"
            type="button"
            role="tab"
            aria-selected={period === 'month'}
            className={cm.button({
              variant: period === 'month' ? 'solid' : 'outline',
              size: 'sm',
            })}
            onClick={() => setPeriod('month')}
            data-mol-id="pricing-page-period-month"
          >
            {t('pricingPage.periodToggle.monthly', undefined, { defaultValue: 'Monthly' })}
          </Pressable>
          <Pressable
            as="button"
            type="button"
            role="tab"
            aria-selected={period === 'year'}
            className={cm.button({
              variant: period === 'year' ? 'solid' : 'outline',
              size: 'sm',
            })}
            onClick={() => setPeriod('year')}
            data-mol-id="pricing-page-period-year"
          >
            {t('pricingPage.periodToggle.yearly', undefined, { defaultValue: 'Yearly' })}
          </Pressable>
        </Box>
      )}

      <Box
        as="div"
        className={cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', justify: 'center' })}
        data-mol-id="pricing-page-grid"
      >
        {renderedTiers.map((tier) => (
          <PricingPageTierCard
            key={tier.key}
            tier={tier}
            period={period}
            cm={cm}
            t={t}
            renderLimits={renderLimits}
            onCheckout={handleCheckout}
            starting={starting}
          />
        ))}
      </Box>

      {startError && (
        <Text
          as="p"
          className={cm.formError}
          role="alert"
          data-mol-id="pricing-page-checkout-error"
        >
          {t('pricingPage.checkoutError', undefined, {
            defaultValue: 'Could not start checkout. Please try again.',
          })}
        </Text>
      )}
    </Box>
  )
}

interface PricingPageTierCardProps<TLimits> {
  tier: PricingTierEntry<TLimits>
  period: PricingPagePeriod
  cm: ReturnType<typeof getClassMap>
  t: ReturnType<typeof useTranslation>['t']
  renderLimits?: (limits: TLimits) => ReactNode
  onCheckout: (tier: PricingTierEntry<TLimits>, price: PricingTierPrice) => Promise<void> | void
  starting: boolean
}

/**
 * Renders a single tier card. Internal — exposed only via `<PricingPage />`.
 *
 * @param props - The component props.
 * @returns The rendered tier card.
 */
function PricingPageTierCard<TLimits>(
  props: PricingPageTierCardProps<TLimits>,
): React.ReactElement {
  const { tier, period, cm, t, renderLimits, onCheckout, starting } = props
  const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
  return (
    <Box
      as="article"
      className={cm.card({ variant: 'default' })}
      data-mol-id={`pricing-page-tier-${tier.key}`}
    >
      <Box as="header" className={cm.cardHeader}>
        <Text as="h2" className={cm.cardTitle}>
          {tier.name}
        </Text>
        <Text as="p" className={cm.cardDescription}>
          {price?.price ?? '—'}
          {tier.perSeat && (
            <Text as="span">
              {' '}
              {t('pricingPage.perSeat', undefined, { defaultValue: 'per seat' })}
            </Text>
          )}
        </Text>
        {price?.savings && (
          <Text as="p" className={cm.cardDescription}>
            {price.savings}
          </Text>
        )}
      </Box>
      <Box as="div" className={cm.cardContent}>
        {renderLimits ? renderLimits(tier.limits) : <PricingPageLimitsList limits={tier.limits} />}
      </Box>
      <Box as="footer" className={cm.cardFooter}>
        <Pressable
          as="button"
          type="button"
          // Upgrade is a page-level CTA: same tier, colour and full width as
          // the identical action in `@molecule/app-billing-react`, so the two
          // pricing surfaces cannot drift apart.
          className={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'lg', fullWidth: true }),
            cm.touchTargetCompact,
          )}
          disabled={!price?.stripePriceId || starting}
          onClick={() => {
            if (price) return onCheckout(tier, price)
          }}
          data-mol-id={`pricing-page-cta-${tier.key}`}
        >
          {price?.stripePriceId
            ? t(
                'pricingPage.upgradeCta',
                { tierName: tier.name },
                { defaultValue: 'Upgrade to {{tierName}}' },
              )
            : t('pricingPage.currentCta', undefined, { defaultValue: 'Current plan' })}
        </Pressable>
      </Box>
    </Box>
  )
}

interface PricingPageLimitsListProps<TLimits> {
  limits: TLimits
}

/**
 * Default render for a tier's `limits` object — a stacked key-value
 * list. Numbers and booleans render directly; objects/arrays
 * JSON-stringify. Apps with richer limit shapes should pass a custom
 * `renderLimits` to `<PricingPage />`.
 *
 * @param props - The component props.
 * @param props.limits - Tier-specific limits to render.
 * @returns A `<dl>` showing each limit field.
 */
function PricingPageLimitsList<TLimits>(
  props: PricingPageLimitsListProps<TLimits>,
): React.ReactElement {
  const { limits } = props
  if (limits == null || typeof limits !== 'object') {
    return <></>
  }
  const entries: [string, unknown][] = Object.entries(limits)
  return (
    <Box as="dl">
      {entries.map(([key, value]) => (
        <Box as="div" key={key}>
          <Text as="dt">{key}</Text>
          <Text as="dd">{formatLimitValue(value)}</Text>
        </Box>
      ))}
    </Box>
  )
}

/**
 * Formats a single tier-limit value as a display string.
 *
 * @param value - The raw value pulled out of the tier-limits object.
 * @returns A user-facing string ("✓", "—", "1,000", "∞", etc.).
 */
function formatLimitValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? '✓' : '—'
  if (typeof value === 'number') {
    if (value >= 999_999) return '∞'
    return value.toLocaleString()
  }
  if (value == null) return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch (_error) {
    // JSON.stringify only throws for circular references or BigInt — fall back to String()
    return String(value)
  }
}

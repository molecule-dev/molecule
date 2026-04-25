import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { usePricingTiers, useStartCheckout } from './hooks.js'
import type { PricingTierEntry, PricingTierPrice } from './types.js'

/** Props for `<PricingPage />`. */
export interface PricingPageProps<TLimits = unknown> {
  /**
   * Optional billing-period selector. Defaults to `'month'`. Pass `'year'`
   * to render the yearly column. The component falls back to whatever the
   * tier provides when the requested period is missing.
   */
  period?: PricingTierPrice['period']

  /**
   * Optional render function for the tier-specific limits column. Defaults
   * to a key-value table rendering numeric / boolean values directly. Apps
   * with rich limit shapes can supply a custom renderer.
   */
  renderLimits?: (limits: TLimits) => React.ReactNode

  /**
   * Optional override for the page-level heading translation key.
   * Defaults to `'billing.pricing.heading'`.
   */
  headingKey?: string

  /** Optional English fallback for the heading. Defaults to `'Choose your plan'`. */
  headingDefault?: string

  /**
   * Optional className applied to the outer wrapper, useful when embedding
   * the page in an existing layout.
   */
  className?: string
}

/**
 * Renders the public pricing page. Fetches `/api/billing/tiers` on mount
 * and lays out one card per tier with the price for the selected period
 * and a CTA that starts a Stripe Checkout session via
 * `/api/billing/checkout`. Tiers without a Stripe priceId (e.g. the free
 * tier or local-dev) render a disabled CTA so users still see the row.
 *
 * @param props - Component props (see `PricingPageProps`).
 * @returns The rendered pricing page.
 */
export function PricingPage<TLimits = unknown>(
  props: PricingPageProps<TLimits>,
): React.ReactElement {
  const {
    period = 'month',
    renderLimits,
    headingKey = 'billing.pricing.heading',
    headingDefault = 'Choose your plan',
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()
  const { data, loading, error } = usePricingTiers<TLimits>()
  const { start, loading: starting, error: startError } = useStartCheckout()

  if (loading) {
    return (
      <div className={className}>
        <p>{t('billing.pricing.loading', undefined, { defaultValue: 'Loading plans…' })}</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={className}>
        <p className={cm.formError}>
          {t('billing.pricing.error', undefined, {
            defaultValue: 'Could not load pricing. Try again later.',
          })}
        </p>
      </div>
    )
  }

  const tiers = data.data

  const handleUpgrade = async (priceId: string | null): Promise<void> => {
    if (!priceId) return
    const response = await start(priceId)
    if (response?.checkoutUrl) {
      window.location.assign(response.checkoutUrl)
    } else if (response?.updated) {
      window.location.reload()
    }
  }

  return (
    <section className={className} data-mol-id="pricing-page">
      <header className={cm.cardHeader}>
        <h1 className={cm.cardTitle}>
          {t(headingKey, undefined, { defaultValue: headingDefault })}
        </h1>
      </header>
      <div className={cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', justify: 'center' })}>
        {tiers.map((tier: PricingTierEntry<TLimits>) => (
          <TierCard
            key={tier.key}
            tier={tier}
            period={period}
            cm={cm}
            t={t}
            renderLimits={renderLimits}
            onUpgrade={handleUpgrade}
            starting={starting}
          />
        ))}
      </div>
      {startError && (
        <p className={cm.formError} role="alert">
          {t('billing.pricing.checkoutError', undefined, {
            defaultValue: 'Could not start checkout. Please try again.',
          })}
        </p>
      )}
    </section>
  )
}

interface TierCardProps<TLimits> {
  tier: PricingTierEntry<TLimits>
  period: PricingTierPrice['period']
  cm: ReturnType<typeof getClassMap>
  t: ReturnType<typeof useTranslation>['t']
  renderLimits?: (limits: TLimits) => React.ReactNode
  onUpgrade: (priceId: string | null) => Promise<void>
  starting: boolean
}

function TierCard<TLimits>({
  tier,
  period,
  cm,
  t,
  renderLimits,
  onUpgrade,
  starting,
}: TierCardProps<TLimits>): React.ReactElement {
  const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]

  return (
    <article className={cm.card({ variant: 'default' })} data-mol-id={`pricing-tier-${tier.key}`}>
      <header className={cm.cardHeader}>
        <h2 className={cm.cardTitle}>{tier.name}</h2>
        <p className={cm.cardDescription}>
          {price?.price ?? '—'}
          {tier.perSeat && (
            <span> {t('billing.pricing.perSeat', undefined, { defaultValue: 'per seat' })}</span>
          )}
        </p>
        {price?.savings && <p className={cm.cardDescription}>{price.savings}</p>}
      </header>
      <div className={cm.cardContent}>
        {renderLimits ? renderLimits(tier.limits) : <DefaultLimits limits={tier.limits} />}
      </div>
      <footer className={cm.cardFooter}>
        <button
          type="button"
          className={cm.button({ variant: 'solid', size: 'md' })}
          disabled={!price?.stripePriceId || starting}
          onClick={() => onUpgrade(price?.stripePriceId ?? null)}
          data-mol-id={`pricing-cta-${tier.key}`}
        >
          {price?.stripePriceId
            ? t(
                'billing.pricing.upgradeCta',
                { tierName: tier.name },
                { defaultValue: 'Upgrade to {{tierName}}' },
              )
            : t('billing.pricing.currentCta', undefined, { defaultValue: 'Current plan' })}
        </button>
      </footer>
    </article>
  )
}

interface DefaultLimitsProps<TLimits> {
  limits: TLimits
}

/**
 * Default render for a tier's `limits` object — a stacked key-value list.
 * Numbers and booleans render directly; objects/arrays JSON-stringify.
 * Apps with richer limit shapes should pass their own `renderLimits` prop
 * to `<PricingPage />`.
 *
 * @param props - The component props.
 * @param props.limits - Tier-specific limits to render.
 * @returns A `<dl>` showing each limit field.
 */
function DefaultLimits<TLimits>({ limits }: DefaultLimitsProps<TLimits>): React.ReactElement {
  if (limits == null || typeof limits !== 'object') {
    return <></>
  }
  const entries = Object.entries(limits as Record<string, unknown>)
  return (
    <dl>
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{formatLimitValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

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
  } catch {
    return String(value)
  }
}

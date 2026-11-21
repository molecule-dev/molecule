/**
 * Solid drop-in pricing page: one card per tier, the optional monthly/yearly
 * toggle and the Stripe Checkout CTA.
 *
 * Solid counterpart of `@molecule/app-pricing-page-react`'s `PricingPage` —
 * the same props (React names), the same DOM for the same input. Reads tiers
 * from `usePricingTiers()` unless an explicit `tiers` prop is passed; the
 * default checkout posts to `/api/billing/checkout` via `useStartCheckout()`.
 *
 * @module
 */

import { type Component, createSignal, For, type JSX, Show } from 'solid-js'

import {
  type PricingTierEntry,
  type PricingTierPrice,
  usePricingTiers,
  useStartCheckout,
} from '@molecule/app-billing-solid'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { PricingPagePeriod, PricingPageProps } from './types.js'

/** One tier card's inputs: the tier plus the page's state and handlers. */
interface PricingPageTierCardProps {
  tier: PricingTierEntry<unknown>
  period: PricingPagePeriod
  renderLimits?: (limits: unknown) => JSX.Element
  onCheckout: (tier: PricingTierEntry<unknown>, price: PricingTierPrice) => Promise<void> | void
  starting: boolean
}

/**
 * Renders a single tier card. Internal — exposed only via `<PricingPage />`.
 *
 * @param props - The component props.
 * @returns The rendered tier card.
 */
const PricingPageTierCard: Component<PricingPageTierCardProps> = (props): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const price = (): PricingTierPrice | undefined =>
    props.tier.prices.find((p) => p.period === props.period) ?? props.tier.prices[0]
  return (
    <article
      class={cm.card({ variant: 'default' })}
      data-mol-id={`pricing-page-tier-${props.tier.key}`}
    >
      <header class={cm.cardHeader}>
        <h2 class={cm.cardTitle}>{props.tier.name}</h2>
        <p class={cm.cardDescription}>
          {price()?.price ?? '—'}
          {props.tier.perSeat && (
            <span> {t('pricingPage.perSeat', undefined, { defaultValue: 'per seat' })}</span>
          )}
        </p>
        {price()?.savings && <p class={cm.cardDescription}>{price()?.savings}</p>}
      </header>
      <div class={cm.cardContent}>
        {props.renderLimits ? props.renderLimits(props.tier.limits) : limitsList(props.tier.limits)}
      </div>
      <footer class={cm.cardFooter}>
        <button
          type="button"
          // Upgrade is a page-level CTA: same tier, colour and full width as
          // the identical action in `@molecule/app-billing-solid`, so the two
          // pricing surfaces cannot drift apart.
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'lg', fullWidth: true }),
            cm.touchTargetCompact,
          )}
          disabled={!price()?.stripePriceId || props.starting}
          onClick={() => {
            const selected = price()
            if (selected) void props.onCheckout(props.tier, selected)
          }}
          data-mol-id={`pricing-page-cta-${props.tier.key}`}
        >
          {price()?.stripePriceId
            ? t(
                'pricingPage.upgradeCta',
                { tierName: props.tier.name },
                { defaultValue: 'Upgrade to {{tierName}}' },
              )
            : t('pricingPage.currentCta', undefined, { defaultValue: 'Current plan' })}
        </button>
      </footer>
    </article>
  )
}

/**
 * Drop-in pricing page. Renders one card per tier from `tiers` (or
 * `usePricingTiers()` if not supplied), with an optional monthly /
 * yearly toggle and a Stripe Checkout CTA per card.
 *
 * @param props - Component props (see `PricingPageProps`).
 * @returns The rendered pricing page.
 */
export const PricingPage: Component<PricingPageProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const fetched = usePricingTiers<unknown>()
  const { start, loading: starting, error: startError } = useStartCheckout()
  const [period, setPeriod] = createSignal<PricingPagePeriod>(props.defaultPeriod ?? 'month')

  /** Whether the page reads the fetched tiers rather than the `tiers` prop. */
  const usingFetched = (): boolean => props.tiers === undefined
  /** The tiers the page renders, from the prop or the fetched response. */
  const tiers = (): PricingTierEntry<unknown>[] | null =>
    props.tiers ?? fetched.data()?.data ?? null

  /**
   * Internal default checkout handler — posts to `/api/billing/checkout`
   * and either navigates to `checkoutUrl` or reloads on in-place update.
   *
   * @param tier - The tier the user selected.
   * @param price - The selected price for that tier.
   */
  const handleCheckout = async (
    tier: PricingTierEntry<unknown>,
    price: PricingTierPrice,
  ): Promise<void> => {
    if (!price.stripePriceId) return
    if (props.onCheckout) {
      await props.onCheckout(tier, price)
      return
    }
    const response = await start(price.stripePriceId)
    if (response?.checkoutUrl && typeof window !== 'undefined') {
      window.location.assign(response.checkoutUrl)
    } else if (response?.updated && typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  /** Whether any tier carries a yearly price (the toggle needs one). */
  const hasYearly = (): boolean =>
    (tiers() ?? []).some((tier) => tier.prices.some((p) => p.period === 'year'))

  return (
    <Show
      when={!(usingFetched() && fetched.loading() && !tiers())}
      fallback={
        <section class={props.className} data-mol-id="pricing-page-loading">
          <p>{t('pricingPage.loading', undefined, { defaultValue: 'Loading plans…' })}</p>
        </section>
      }
    >
      <Show
        when={!(usingFetched() && (fetched.error() || !tiers()))}
        fallback={
          <section class={props.className} data-mol-id="pricing-page-error">
            <p class={cm.formError} role="alert">
              {t('pricingPage.error', undefined, {
                defaultValue: 'Could not load pricing. Try again later.',
              })}
            </p>
          </section>
        }
      >
        <section class={props.className} data-mol-id="pricing-page">
          <header class={cm.cardHeader}>
            <h1 class={cm.cardTitle}>
              {t(props.headingKey ?? 'pricingPage.heading', undefined, {
                defaultValue: props.headingDefault ?? 'Choose your plan',
              })}
            </h1>
          </header>
          <Show when={(props.showPeriodToggle ?? true) && hasYearly()}>
            <div
              class={cm.flex({ direction: 'row', gap: 'sm', justify: 'center' })}
              data-mol-id="pricing-page-period-toggle"
              role="tablist"
              aria-label={t('pricingPage.periodToggle.label', undefined, {
                defaultValue: 'Billing period',
              })}
            >
              <button
                type="button"
                role="tab"
                aria-selected={period() === 'month'}
                class={cm.button({
                  variant: period() === 'month' ? 'solid' : 'outline',
                  size: 'sm',
                })}
                onClick={() => setPeriod('month')}
                data-mol-id="pricing-page-period-month"
              >
                {t('pricingPage.periodToggle.monthly', undefined, { defaultValue: 'Monthly' })}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={period() === 'year'}
                class={cm.button({
                  variant: period() === 'year' ? 'solid' : 'outline',
                  size: 'sm',
                })}
                onClick={() => setPeriod('year')}
                data-mol-id="pricing-page-period-year"
              >
                {t('pricingPage.periodToggle.yearly', undefined, { defaultValue: 'Yearly' })}
              </button>
            </div>
          </Show>
          <div
            class={cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', justify: 'center' })}
            data-mol-id="pricing-page-grid"
          >
            <For each={tiers() ?? []}>
              {(tier): JSX.Element => (
                <PricingPageTierCard
                  tier={tier}
                  period={period()}
                  renderLimits={props.renderLimits}
                  onCheckout={handleCheckout}
                  starting={starting()}
                />
              )}
            </For>
          </div>
          <Show when={startError()}>
            <p class={cm.formError} role="alert" data-mol-id="pricing-page-checkout-error">
              {t('pricingPage.checkoutError', undefined, {
                defaultValue: 'Could not start checkout. Please try again.',
              })}
            </p>
          </Show>
        </section>
      </Show>
    </Show>
  )
}

/**
 * Default render for a tier's `limits` object — a stacked key-value
 * list. Numbers and booleans render directly; objects/arrays
 * JSON-stringify. Apps with richer limit shapes should pass a custom
 * `renderLimits` prop to `<PricingPage />`.
 *
 * @param limits - Tier-specific limits to render.
 * @returns A `<dl>` showing each limit field, or nothing for a non-object.
 */
function limitsList(limits: unknown): JSX.Element {
  if (limits == null || typeof limits !== 'object') {
    return null
  }
  const entries = Object.entries(limits as Record<string, unknown>)
  return (
    <dl>
      <For each={entries}>
        {([key, value]) => (
          <div>
            <dt>{key}</dt>
            <dd>{formatLimitValue(value)}</dd>
          </div>
        )}
      </For>
    </dl>
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

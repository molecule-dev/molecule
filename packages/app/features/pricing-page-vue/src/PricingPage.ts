/**
 * Vue drop-in pricing page: one card per tier, the optional monthly/yearly
 * toggle and the Stripe Checkout CTA.
 *
 * Vue counterpart of `@molecule/app-pricing-page-react`'s `PricingPage` —
 * the same props (React names), the same DOM for the same input. Reads tiers
 * from `usePricingTiers()` unless an explicit `tiers` prop is passed; the
 * default checkout posts to `/api/billing/checkout` via `useStartCheckout()`.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import {
  type PricingTierEntry,
  type PricingTierPrice,
  usePricingTiers,
  useStartCheckout,
} from '@molecule/app-billing-vue'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { PricingPagePeriod, PricingPageProps } from './types.js'

/**
 * Drop-in pricing page. Renders one card per tier from `tiers` (or
 * `usePricingTiers()` if not supplied), with an optional monthly /
 * yearly toggle and a Stripe Checkout CTA per card.
 *
 * @param props - Component props (see `PricingPageProps`).
 * @returns The rendered pricing page.
 */
export const PricingPage = defineComponent({
  name: 'PricingPage',
  props: {
    tiers: {
      type: Array as PropType<PricingPageProps['tiers']>,
      required: false,
    },
    onCheckout: {
      type: Function as PropType<PricingPageProps['onCheckout']>,
      required: false,
    },
    showPeriodToggle: {
      type: Boolean,
      default: true,
    },
    defaultPeriod: {
      type: String as PropType<PricingPagePeriod>,
      default: 'month',
    },
    renderLimits: {
      type: Function as PropType<PricingPageProps['renderLimits']>,
      required: false,
    },
    headingKey: {
      type: String,
      default: 'pricingPage.heading',
    },
    headingDefault: {
      type: String,
      default: 'Choose your plan',
    },
    className: String,
  },
  setup(props: PricingPageProps) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const fetched = usePricingTiers<unknown>()
    const { start, loading: starting, error: startError } = useStartCheckout()
    const period = ref<PricingPagePeriod>(props.defaultPeriod ?? 'month')

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

    /**
     * Renders a single tier card.
     *
     * @param tier - The tier to render.
     * @returns The card's root `<article>`.
     */
    const tierCard = (tier: PricingTierEntry<unknown>): VNode => {
      const price = tier.prices.find((p) => p.period === period.value) ?? tier.prices[0]
      return h(
        'article',
        {
          key: tier.key,
          class: cm.card({ variant: 'default' }),
          'data-mol-id': `pricing-page-tier-${tier.key}`,
        },
        [
          h('header', { class: cm.cardHeader }, [
            h('h2', { class: cm.cardTitle }, tier.name),
            h('p', { class: cm.cardDescription }, [
              price?.price ?? '—',
              tier.perSeat
                ? h('span', ` ${t('pricingPage.perSeat', undefined, { defaultValue: 'per seat' })}`)
                : null,
            ]),
            price?.savings ? h('p', { class: cm.cardDescription }, price.savings) : null,
          ]),
          h('div', { class: cm.cardContent }, [
            props.renderLimits ? props.renderLimits(tier.limits) : limitsList(tier.limits),
          ]),
          h('footer', { class: cm.cardFooter }, [
            h(
              'button',
              {
                type: 'button',
                // Upgrade is a page-level CTA: same tier, colour and full width as
                // the identical action in `@molecule/app-billing-vue`, so the two
                // pricing surfaces cannot drift apart.
                class: cm.cn(
                  cm.button({ variant: 'solid', color: 'primary', size: 'lg', fullWidth: true }),
                  cm.touchTargetCompact,
                ),
                disabled: !price?.stripePriceId || starting.value,
                onClick: () => {
                  if (price) void handleCheckout(tier, price)
                },
                'data-mol-id': `pricing-page-cta-${tier.key}`,
              },
              price?.stripePriceId
                ? t(
                    'pricingPage.upgradeCta',
                    { tierName: tier.name },
                    { defaultValue: 'Upgrade to {{tierName}}' },
                  )
                : t('pricingPage.currentCta', undefined, { defaultValue: 'Current plan' }),
            ),
          ]),
        ],
      )
    }

    return (): VNode => {
      const usingFetched = props.tiers === undefined
      const tiers: PricingTierEntry<unknown>[] | null =
        props.tiers ?? fetched.data.value?.data ?? null

      if (usingFetched && fetched.loading.value && !tiers) {
        return h('section', { class: props.className, 'data-mol-id': 'pricing-page-loading' }, [
          h('p', t('pricingPage.loading', undefined, { defaultValue: 'Loading plans…' })),
        ])
      }

      if (usingFetched && (fetched.error.value || !tiers)) {
        return h('section', { class: props.className, 'data-mol-id': 'pricing-page-error' }, [
          h(
            'p',
            { class: cm.formError, role: 'alert' },
            t('pricingPage.error', undefined, {
              defaultValue: 'Could not load pricing. Try again later.',
            }),
          ),
        ])
      }

      const renderedTiers = tiers ?? []
      const hasYearly = renderedTiers.some((tier) => tier.prices.some((p) => p.period === 'year'))

      return h('section', { class: props.className, 'data-mol-id': 'pricing-page' }, [
        h('header', { class: cm.cardHeader }, [
          h(
            'h1',
            { class: cm.cardTitle },
            t(props.headingKey ?? 'pricingPage.heading', undefined, {
              defaultValue: props.headingDefault ?? 'Choose your plan',
            }),
          ),
        ]),
        props.showPeriodToggle && hasYearly
          ? h(
              'div',
              {
                class: cm.flex({ direction: 'row', gap: 'sm', justify: 'center' }),
                'data-mol-id': 'pricing-page-period-toggle',
                role: 'tablist',
                'aria-label': t('pricingPage.periodToggle.label', undefined, {
                  defaultValue: 'Billing period',
                }),
              },
              [
                h(
                  'button',
                  {
                    type: 'button',
                    role: 'tab',
                    'aria-selected': period.value === 'month',
                    class: cm.button({
                      variant: period.value === 'month' ? 'solid' : 'outline',
                      size: 'sm',
                    }),
                    onClick: () => {
                      period.value = 'month'
                    },
                    'data-mol-id': 'pricing-page-period-month',
                  },
                  t('pricingPage.periodToggle.monthly', undefined, { defaultValue: 'Monthly' }),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    role: 'tab',
                    'aria-selected': period.value === 'year',
                    class: cm.button({
                      variant: period.value === 'year' ? 'solid' : 'outline',
                      size: 'sm',
                    }),
                    onClick: () => {
                      period.value = 'year'
                    },
                    'data-mol-id': 'pricing-page-period-year',
                  },
                  t('pricingPage.periodToggle.yearly', undefined, { defaultValue: 'Yearly' }),
                ),
              ],
            )
          : null,
        h(
          'div',
          {
            class: cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', justify: 'center' }),
            'data-mol-id': 'pricing-page-grid',
          },
          renderedTiers.map((tier) => tierCard(tier)),
        ),
        startError.value
          ? h(
              'p',
              { class: cm.formError, role: 'alert', 'data-mol-id': 'pricing-page-checkout-error' },
              t('pricingPage.checkoutError', undefined, {
                defaultValue: 'Could not start checkout. Please try again.',
              }),
            )
          : null,
      ])
    }
  },
})

/**
 * Default render for a tier's `limits` object — a stacked key-value
 * list. Numbers and booleans render directly; objects/arrays
 * JSON-stringify. Apps with richer limit shapes should pass a custom
 * `renderLimits` prop to `<PricingPage />`.
 *
 * @param limits - Tier-specific limits to render.
 * @returns A `<dl>` showing each limit field, or nothing for a non-object.
 */
function limitsList(limits: unknown): VNodeChild {
  if (limits == null || typeof limits !== 'object') {
    return null
  }
  const entries = Object.entries(limits as Record<string, unknown>)
  return h(
    'dl',
    entries.map(([key, value]) =>
      h('div', { key }, [h('dt', key), h('dd', formatLimitValue(value))]),
    ),
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

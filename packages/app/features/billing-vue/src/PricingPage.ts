/**
 * Vue public pricing page: the tier table, its limits and the upgrade flow.
 *
 * Vue counterpart of `@molecule/app-billing-react`'s `PricingPage` and its two
 * limit components — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-vue'
import { useAuth, useTranslation } from '@molecule/app-vue'

import { usePricingTiers, useStartCheckout } from './hooks.js'
import { billingBilledLabel, billingLimitLabel, billingLimitValue } from './labels.js'
import type { PricingTierEntry, PricingTierPrice } from './types.js'

/**
 * Container for a tier's feature list. Apps use this in their
 * `renderLimits` prop with `<LimitsItem>` children to get the polished
 * stacked-checklist layout (check icon prefix, muted/primary colors,
 * spacing) that matches the rest of `<PricingPage />`.
 *
 * @example
 * ```ts
 * h(PricingPage, {
 *   renderLimits: (limits) =>
 *     h(LimitsList, null, () => [
 *       h(LimitsItem, null, () => `Blocks: ${limits.maxBlocks}`),
 *       h(LimitsItem, { included: limits.canExport }, () => 'Data export'),
 *     ]),
 * })
 * ```
 */
export const LimitsList = defineComponent({
  name: 'LimitsList',
  setup(_props, { slots }) {
    const cm = getClassMap()
    return (): VNode =>
      h('ul', { class: cm.stack(3), 'data-mol-id': 'pricing-limits-list' }, slots.default?.() ?? [])
  },
})

/** Props for `<LimitsItem>`. */
export interface LimitsItemProps {
  /**
   * Whether this feature is included in the tier. When `false`, the row
   * renders with a muted line-through and a dash glyph instead of the
   * check icon. Defaults to `true`.
   */
  included?: boolean
}

/**
 * Single row in a tier's feature list — a check (or em-dash) icon
 * followed by the row label. Use inside `<LimitsList>`.
 *
 * @param props - Component props (see {@link LimitsItemProps}).
 * @returns The rendered row.
 */
export const LimitsItem = defineComponent({
  name: 'LimitsItem',
  props: {
    included: {
      type: Boolean,
      default: true,
    },
  },
  setup(props: LimitsItemProps, { slots }) {
    const cm = getClassMap()
    return (): VNode =>
      h(
        'li',
        {
          class: cm.cn(
            cm.flex({ direction: 'row', align: 'start', gap: 'sm' }),
            cm.textSize('sm'),
            !props.included && cm.textMuted,
          ),
        },
        [
          h(Icon, {
            name: props.included ? 'check-circle' : 'minus',
            size: 18,
            'aria-hidden': 'true',
            className: props.included ? cm.textPrimary : cm.textSubtle,
          }),
          h('span', slots.default?.() ?? []),
        ],
      )
  },
})

/**
 * Default "anonymous → routes to" path used when a logged-out visitor
 * clicks an upgrade CTA. Apps can override via the `unauthenticatedRedirect`
 * prop. `/login` is the convention across flagship templates.
 */
const DEFAULT_UNAUTHENTICATED_REDIRECT = '/login'

/**
 * Headline font is sourced from the app's theme via the
 * `--font-headline` CSS variable. Apps that want a serif/display
 * treatment set this variable in their `theme.css`. Apps that don't
 * set it inherit the body font (no special headline treatment), which
 * is the safe default for a generic shared component — we never bake
 * a specific font family into the shared package.
 */
const DEFAULT_HEADLINE_FONT = 'var(--font-headline, inherit)'

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
   * to a stacked checklist rendering numeric / boolean values with a green
   * check glyph. Apps with rich limit shapes can supply a custom renderer.
   */
  renderLimits?: (limits: TLimits) => VNodeChild

  /**
   * Optional override for the page-level heading translation key.
   * Defaults to `'billing.pricing.heading'`.
   */
  headingKey?: string

  /** Optional English fallback for the heading. Defaults to `'Choose your plan'`. */
  headingDefault?: string

  /**
   * Optional sub-heading shown under the page heading. Pass `null` to
   * suppress. Defaults to a translated "Pick the plan that fits…" line.
   */
  subheadingKey?: string | null
  /** English fallback for the sub-heading. */
  subheadingDefault?: string

  /**
   * Optional className applied to the outer wrapper, useful when embedding
   * the page in an existing layout.
   */
  className?: string

  /**
   * Path the browser is sent to when an anonymous visitor clicks a paid
   * tier's upgrade CTA. Defaults to `/login`. Set to `null` to disable
   * the redirect (e.g. when the app handles the auth gate at a higher
   * level via routing guards).
   */
  unauthenticatedRedirect?: string | null

  /**
   * Optional tier key to highlight as "most popular" — receives the
   * elevated card variant, a popular-badge in the header, and a
   * primary-tone CTA. When omitted (default), the highest-priced tier
   * with a real stripePriceId for the selected period is auto-selected.
   * Pass `null` to disable highlighting entirely.
   */
  popularTierKey?: string | null

  /**
   * Optional font-family stack applied inline to the page heading,
   * tier names, and hero price. Pass `null` to disable inline font and
   * inherit from the theme.
   */
  headlineFontFamily?: string | null
}

/** One card's inputs: the tier, the price resolved for the page's period. */
interface TierCardInput<TLimits> {
  tier: PricingTierEntry<TLimits>
  price: PricingTierPrice | undefined
  popular: boolean
}

/**
 * Renders the public pricing page. Fetches `/api/billing/tiers` on mount
 * and lays out one card per tier with the price for the selected period
 * and a CTA that starts a Stripe Checkout session via
 * `/api/billing/checkout`. Tiers without a Stripe priceId (e.g. the free
 * tier or local-dev) render a disabled CTA so users still see the row.
 *
 * The highest-priced paid tier is highlighted as "most popular" by
 * default — the card uses the elevated variant, the header carries a
 * star badge, and its CTA renders in the primary color. Apps that want
 * a different tier in the spotlight can pass `popularTierKey` (or
 * `null` to suppress).
 *
 * @param props - Component props (see `PricingPageProps`).
 * @returns The rendered pricing page.
 */
export const PricingPage = defineComponent({
  name: 'PricingPage',
  props: {
    period: {
      type: String as PropType<PricingTierPrice['period']>,
      default: 'month',
    },
    renderLimits: {
      type: Function as PropType<PricingPageProps['renderLimits']>,
      required: false,
    },
    headingKey: {
      type: String,
      default: 'billing.pricing.heading',
    },
    headingDefault: {
      type: String,
      default: 'Choose your plan',
    },
    subheadingKey: {
      type: String as PropType<string | null>,
      default: 'billing.pricing.subheading',
    },
    subheadingDefault: {
      type: String,
      default: 'Pick the plan that fits how you work. Upgrade or downgrade any time.',
    },
    className: String,
    unauthenticatedRedirect: {
      type: String as PropType<string | null>,
      default: DEFAULT_UNAUTHENTICATED_REDIRECT,
    },
    popularTierKey: {
      type: String as PropType<string | null>,
      required: false,
    },
    headlineFontFamily: {
      type: String as PropType<string | null>,
      default: DEFAULT_HEADLINE_FONT,
    },
  },
  setup(props: PricingPageProps) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const auth = useAuth()
    const { data, loading, error } = usePricingTiers()
    const { start, loading: starting, error: startError } = useStartCheckout()

    /**
     * Posts one price to the checkout endpoint and follows its handoff: the
     * provider's checkout URL, an in-place update, or (for an anonymous
     * visitor whose POST failed) the app's login route.
     *
     * @param priceId - The Stripe price to subscribe to, or `null` for a tier
     *   without one (the CTA is disabled then; nothing is sent).
     */
    const handleUpgrade = async (priceId: string | null): Promise<void> => {
      if (!priceId) return
      // Always fire the POST so the API is the source of truth for auth and
      // entitlement gating. Redirect anonymous visitors only AFTER the POST
      // resolves (or fails), so the request is always observable.
      const response = await start(priceId)
      if (!response) {
        if (
          !auth.isAuthenticated.value &&
          props.unauthenticatedRedirect &&
          typeof window !== 'undefined'
        ) {
          window.location.assign(props.unauthenticatedRedirect)
        }
        return
      }
      if (response.checkoutUrl) {
        window.location.assign(response.checkoutUrl)
      } else if (response.updated) {
        window.location.reload()
      }
    }

    /**
     * Renders one tier card.
     *
     * @param input - The tier, its resolved price and whether it is the popular one.
     * @returns The card's root wrapper.
     */
    const tierCard = (input: TierCardInput<unknown>): VNode => {
      const { tier, price, popular } = input
      const headlineStyle =
        props.headlineFontFamily === null ? undefined : { fontFamily: props.headlineFontFamily }

      return h(
        'div',
        // Outer wrapper keeps the popular tier physically larger (taller
        // + wider) than its neighbors.
        {
          key: tier.key,
          style: {
            position: 'relative',
            width: popular ? '24rem' : '19rem',
            marginTop: popular ? '-1.5rem' : 0,
            marginBottom: popular ? '-1.5rem' : 0,
          },
        },
        [
          h(
            'article',
            {
              class: cm.cn(
                cm.card({ variant: 'elevated' }),
                cm.flex({ direction: 'col' }),
                popular && cm.borderTPrimary,
              ),
              style: {
                position: 'relative',
                height: '100%',
                padding: popular ? '3rem 2.5rem 2.5rem' : '2.5rem 2rem',
                boxShadow: popular
                  ? '0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 8px 16px -8px rgba(15, 23, 42, 0.08)'
                  : '0 12px 24px -8px rgba(15, 23, 42, 0.10), 0 4px 8px -4px rgba(15, 23, 42, 0.06)',
              },
              'data-mol-id': `pricing-tier-${tier.key}`,
              'data-popular': popular ? 'true' : undefined,
            },
            [
              popular
                ? h(
                    'span',
                    {
                      class: cm.cn(
                        cm.uppercase,
                        cm.trackingWide,
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                      ),
                      style: {
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        backgroundColor: 'var(--color-accent-soft, #ffdf99)',
                        color: 'var(--color-on-accent-soft, #5a4300)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        lineHeight: 1.2,
                        zIndex: 1,
                      },
                      'data-mol-id': `pricing-tier-${tier.key}-popular-badge`,
                    },
                    t('billing.pricing.mostPopular', undefined, { defaultValue: 'Most popular' }),
                  )
                : null,
              // Card heading, not a page banner.
              h('div', { class: cm.cardHeader }, [
                !popular
                  ? h(
                      'p',
                      {
                        class: cm.cn(
                          cm.textSize('xs'),
                          cm.textSubtle,
                          cm.fontWeight('semibold'),
                          cm.uppercase,
                          cm.trackingWide,
                          cm.sp('mb', 2),
                        ),
                        'data-mol-id': `pricing-tier-${tier.key}-eyebrow`,
                      },
                      t('billing.pricing.tierEyebrow', undefined, { defaultValue: 'Tier' }),
                    )
                  : null,
                h(
                  'h2',
                  {
                    class: cm.cn(
                      cm.textSize('2xl'),
                      cm.italic,
                      cm.fontWeight('semibold'),
                      cm.sp('mb', 4),
                    ),
                    style: headlineStyle,
                  },
                  tier.name,
                ),
                h('p', [
                  h(
                    'span',
                    {
                      class: cm.cn(
                        cm.textSize('5xl'),
                        cm.fontWeight('bold'),
                        popular && cm.textPrimary,
                      ),
                      style: headlineStyle,
                    },
                    price?.price ?? '—',
                  ),
                  tier.perSeat
                    ? h(
                        'span',
                        {
                          class: cm.cn(cm.textSize('sm'), cm.textMuted, cm.fontWeight('normal')),
                        },
                        [
                          ' ',
                          t('billing.pricing.perSeat', undefined, { defaultValue: 'per seat' }),
                        ],
                      )
                    : null,
                ]),
                h(
                  'p',
                  {
                    class: cm.cn(
                      cm.textSize('xs'),
                      cm.textSubtle,
                      cm.fontWeight('semibold'),
                      cm.uppercase,
                      cm.trackingWide,
                      cm.sp('mt', 2),
                    ),
                  },
                  [
                    billingBilledLabel(price?.period ?? 'month', t),
                    price?.savings
                      ? [' · ', h('span', { class: cm.textSuccess }, price.savings.toUpperCase())]
                      : null,
                  ],
                ),
              ]),
              h('div', { class: cm.cn(cm.cardContent, cm.flex1) }, [
                props.renderLimits
                  ? props.renderLimits(tier.limits)
                  : defaultLimits(tier.limits, cm, t),
              ]),
              h('footer', { class: cm.cardFooter }, [
                h(
                  'button',
                  {
                    type: 'button',
                    class: cm.cn(
                      cm.button({
                        variant: popular ? 'solid' : 'outline',
                        color: popular ? 'primary' : undefined,
                        size: 'lg',
                        fullWidth: true,
                      }),
                      popular && cm.gradientPrimary,
                      cm.uppercase,
                      cm.trackingWide,
                      cm.fontWeight('semibold'),
                      cm.touchTargetCompact,
                    ),
                    disabled: !price?.stripePriceId || starting.value,
                    onClick: () => handleUpgrade(price?.stripePriceId ?? null),
                    'data-mol-id': `pricing-cta-${tier.key}`,
                  },
                  price?.stripePriceId
                    ? t(
                        'billing.pricing.upgradeCta',
                        { tierName: tier.name },
                        { defaultValue: 'Upgrade to {{tierName}}' },
                      )
                    : t('billing.pricing.currentCta', undefined, {
                        defaultValue: 'Current plan',
                      }),
                ),
              ]),
            ],
          ),
        ],
      )
    }

    return (): VNode => {
      if (loading.value) {
        return h(
          'section',
          {
            class: cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('py', 16), props.className),
            'data-mol-id': 'pricing-page',
          },
          [
            h(
              'p',
              { class: cm.textMuted },
              t('billing.pricing.loading', undefined, { defaultValue: 'Loading plans…' }),
            ),
          ],
        )
      }

      if (error.value || !data.value) {
        return h(
          'section',
          {
            class: cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('py', 16), props.className),
            'data-mol-id': 'pricing-page',
          },
          [
            h(
              'p',
              { class: cm.formError },
              t('billing.pricing.error', undefined, {
                defaultValue: 'Could not load pricing. Try again later.',
              }),
            ),
          ],
        )
      }

      const rawTiers = data.value.data

      // Default-pick the popular tier: highest-priced paid tier that has a
      // real Stripe price id for the active period. Honors `popularTierKey`
      // override when set (string = use that key; null = disable highlight).
      const resolvedPopularKey =
        props.popularTierKey === null
          ? null
          : (props.popularTierKey ?? autoSelectPopular(rawTiers, props.period ?? 'month'))

      const tiers = centerPopularTier(rawTiers, resolvedPopularKey)
      const headlineStyle =
        props.headlineFontFamily === null ? undefined : { fontFamily: props.headlineFontFamily }

      return h(
        'section',
        {
          class: cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), props.className),
          'data-mol-id': 'pricing-page',
        },
        [
          // A `<section>`, not `<header>`: the app's own top bar is the page's
          // single banner — a second header element here reads as a duplicate.
          h('section', { class: cm.cn(cm.textCenter, cm.sp('mb', 10)) }, [
            h(
              'h1',
              {
                class: cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), cm.sp('mb', 3)),
                style: headlineStyle,
                'data-mol-id': 'pricing-page-heading',
              },
              t(props.headingKey ?? 'billing.pricing.heading', undefined, {
                defaultValue: props.headingDefault ?? 'Choose your plan',
              }),
            ),
            props.subheadingKey !== null
              ? h(
                  'p',
                  {
                    class: cm.cn(cm.textSize('lg'), cm.textMuted, cm.maxW('2xl'), cm.mxAuto),
                    'data-mol-id': 'pricing-page-subheading',
                  },
                  t(props.subheadingKey ?? 'billing.pricing.subheading', undefined, {
                    defaultValue:
                      props.subheadingDefault ??
                      'Pick the plan that fits how you work. Upgrade or downgrade any time.',
                  }),
                )
              : null,
          ]),
          h(
            'div',
            {
              class: cm.flex({
                direction: 'row',
                wrap: 'wrap',
                gap: 'lg',
                justify: 'center',
                align: 'stretch',
              }),
            },
            tiers.map((tier) =>
              tierCard({
                tier,
                price: tier.prices.find((p) => p.period === props.period) ?? tier.prices[0],
                popular: tier.key === resolvedPopularKey,
              }),
            ),
          ),
          startError.value
            ? h(
                'p',
                { class: cm.cn(cm.formError, cm.sp('mt', 6), cm.textCenter), role: 'alert' },
                t('billing.pricing.checkoutError', undefined, {
                  defaultValue: 'Could not start checkout. Please try again.',
                }),
              )
            : null,
          h(
            'p',
            {
              class: cm.cn(cm.sp('mt', 10), cm.textCenter, cm.textSize('xs'), cm.textSubtle),
              'data-mol-id': 'pricing-page-reassurance',
            },
            t('billing.pricing.reassurance', undefined, {
              defaultValue: 'Cancel anytime · No credit card required to start',
            }),
          ),
        ],
      )
    }
  },
})

/**
 * Default render for a tier's `limits` object — a stacked checklist with a
 * green check glyph per row. The row labels and the unlimited sentinel go
 * through `t()` (`billing.pricing.limit.<key>`, with the humanized English as
 * the fallback for a key the locale bond does not carry); numbers and booleans
 * render directly; objects/arrays JSON-stringify. Apps with richer limit
 * shapes should pass their own `renderLimits` prop to `<PricingPage />`.
 *
 * @param limits - Tier-specific limits to render.
 * @param cm - Active ClassMap instance.
 * @param t - The host app's translate function.
 * @returns A `<ul>` of check-prefixed limit rows, or nothing for a non-object.
 */
function defaultLimits(
  limits: unknown,
  cm: ReturnType<typeof getClassMap>,
  t: ReturnType<typeof useTranslation>['t'],
): VNodeChild {
  if (limits == null || typeof limits !== 'object') {
    return null
  }
  const entries = Object.entries(limits as Record<string, unknown>)
  return h(
    'ul',
    { class: cm.stack(2) },
    entries.map(([key, value]) =>
      h(
        'li',
        {
          key,
          class: cm.cn(cm.flex({ direction: 'row', align: 'start', gap: 'sm' }), cm.textSize('sm')),
        },
        [
          h(Icon, {
            name: 'check-circle',
            size: 16,
            className: cm.textSuccess,
            'aria-hidden': 'true',
          }),
          h('span', [
            h('span', { class: cm.textMuted }, `${billingLimitLabel(key, t)}: `),
            h('span', { class: cm.fontWeight('medium') }, billingLimitValue(value, t)),
          ]),
        ],
      ),
    ),
  )
}

/**
 * Pick the "most popular" tier when the caller hasn't specified one:
 * the highest-priced paid tier that has a real stripePriceId for the
 * active period. If nothing qualifies, returns null (no highlight).
 *
 * @param tiers - The tiers as the API returned them.
 * @param period - The billing period the page renders.
 * @returns The popular tier's key, or null.
 */
function autoSelectPopular<TLimits>(
  tiers: ReadonlyArray<PricingTierEntry<TLimits>>,
  period: PricingTierPrice['period'],
): string | null {
  let bestKey: string | null = null
  let bestCents = -1
  for (const tier of tiers) {
    const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
    if (!price?.stripePriceId) continue
    const cents = priceToCents(price.price)
    if (cents > bestCents) {
      bestCents = cents
      bestKey = tier.key
    }
  }
  return bestKey
}

/**
 * Parses a price label string (e.g. `"$12.99/mo"`) into an integer cent value for comparison.
 *
 * @param label - The price label.
 * @returns The price in cents, or 0 when the label holds no number.
 */
function priceToCents(label: string | null | undefined): number {
  if (!label) return 0
  // Accept "$12", "$12.99/mo", "€12,99" — strip currency + suffix, parse the number.
  const match = label.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return 0
  return Math.round(Number(match[1].replace(',', '.')) * 100)
}

/**
 * Move the popular tier to the visual center of the row so the
 * highlighted card flanks the other tiers. Returns a new array with the
 * popular tier at `Math.floor(N/2)`; if the popular key isn't found, or
 * is already in that position, the array is returned unchanged.
 *
 * @param tiers - The tiers as the API returned them.
 * @param popularKey - The popular tier's key, or null.
 * @returns The tiers in presentation order.
 */
function centerPopularTier<TLimits>(
  tiers: ReadonlyArray<PricingTierEntry<TLimits>>,
  popularKey: string | null,
): PricingTierEntry<TLimits>[] {
  if (!popularKey || tiers.length < 3) return [...tiers]
  const targetIdx = Math.floor(tiers.length / 2)
  const currentIdx = tiers.findIndex((t) => t.key === popularKey)
  if (currentIdx === -1 || currentIdx === targetIdx) return [...tiers]
  const next = [...tiers]
  const [popular] = next.splice(currentIdx, 1)
  next.splice(targetIdx, 0, popular!)
  return next
}

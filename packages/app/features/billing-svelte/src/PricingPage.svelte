<!--
  PricingPage: the Svelte counterpart of `@molecule/app-billing-react`'s
  `PricingPage` — the public pricing table fetched from `/api/billing/tiers`,
  one card per tier with its price, limits and upgrade CTA. Same props (React
  names), same DOM for the same input; the `renderLimits` render function is a
  snippet, called with the tier's limits.
-->
<script module lang="ts">
  /**
   * Pick the "most popular" tier when the caller hasn't specified one:
   * the highest-priced paid tier that has a real stripePriceId for the
   * active period. If nothing qualifies, returns null (no highlight).
   *
   * @param tiers - The tiers as the API returned them.
   * @param period - The billing period the page renders.
   * @returns The popular tier's key, or null.
   */
  function autoSelectPopular(
    tiers: ReadonlyArray<PricingTierEntry<unknown>>,
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
  function centerPopularTier(
    tiers: ReadonlyArray<PricingTierEntry<unknown>>,
    popularKey: string | null,
  ): PricingTierEntry<unknown>[] {
    if (!popularKey || tiers.length < 3) return [...tiers]
    const targetIdx = Math.floor(tiers.length / 2)
    const currentIdx = tiers.findIndex((t) => t.key === popularKey)
    if (currentIdx === -1 || currentIdx === targetIdx) return [...tiers]
    const next = [...tiers]
    const [popular] = next.splice(currentIdx, 1)
    next.splice(targetIdx, 0, popular!)
    return next
  }
</script>

<script lang="ts">
  import { get } from 'svelte/store'

  import { useAuth, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Icon } from '@molecule/app-ui-svelte'

  import { usePricingTiers, useStartCheckout } from './hooks.js'
  import { billingBilledLabel, billingLimitLabel, billingLimitValue } from './labels.js'
  import type { PricingPageProps, PricingTierEntry, PricingTierPrice } from './types.js'

  let {
    period = 'month',
    renderLimits,
    headingKey = 'billing.pricing.heading',
    headingDefault = 'Choose your plan',
    subheadingKey = 'billing.pricing.subheading',
    subheadingDefault = 'Pick the plan that fits how you work. Upgrade or downgrade any time.',
    className,
    unauthenticatedRedirect = '/login',
    popularTierKey,
    headlineFontFamily = 'var(--font-headline, inherit)',
  }: PricingPageProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const auth = useAuth()
  const { data, loading, error } = usePricingTiers()
  const { start, loading: starting, error: startError } = useStartCheckout()

  /** The tiers as the API returned them. */
  const rawTiers = $derived($data?.data ?? [])

  // Default-pick the popular tier: highest-priced paid tier that has a real
  // Stripe price id for the active period. Honors `popularTierKey` override
  // when set (string = use that key; null = disable highlight).
  const resolvedPopularKey = $derived(
    popularTierKey === null ? null : (popularTierKey ?? autoSelectPopular(rawTiers, period)),
  )

  /** The tiers in presentation order, the popular one centred. */
  const tiers = $derived(centerPopularTier(rawTiers, resolvedPopularKey))

  /** The inline headline font, or nothing when the caller disables it. */
  const headlineStyle = $derived(
    headlineFontFamily === null ? undefined : `font-family: ${headlineFontFamily}`,
  )

  /**
   * Posts one price to the checkout endpoint and follows its handoff: the
   * provider's checkout URL, an in-place update, or (for an anonymous visitor
   * whose POST failed) the app's login route.
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
      if (!get(auth.isAuthenticated) && unauthenticatedRedirect && typeof window !== 'undefined') {
        window.location.assign(unauthenticatedRedirect)
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
   * The price a card shows for the page's period, falling back to the tier's first.
   *
   * @param tier - The tier to resolve a price for.
   * @returns The price, or undefined for a tier without any.
   */
  const priceFor = (tier: PricingTierEntry<unknown>): PricingTierPrice | undefined =>
    tier.prices.find((p) => p.period === period) ?? tier.prices[0]

  /**
   * Whether a limits value is an object the default rows can enumerate.
   *
   * @param limits - The tier's limits value.
   * @returns True for a non-null object.
   */
  const isObjectLimits = (limits: unknown): limits is Record<string, unknown> =>
    limits != null && typeof limits === 'object'

  /**
   * The outer wrapper's inline style, which keeps the popular tier physically
   * larger (taller + wider) than its neighbors.
   *
   * @param popular - Whether this card is the highlighted one.
   * @returns The style attribute's value.
   */
  const wrapStyle = (popular: boolean): string =>
    `position: relative; width: ${popular ? '24rem' : '19rem'}; margin-top: ${
      popular ? '-1.5rem' : '0'
    }; margin-bottom: ${popular ? '-1.5rem' : '0'}`

  /**
   * The card's inline style: editorial padding and the soft shadow that lifts
   * it off any same-colored page background.
   *
   * @param popular - Whether this card is the highlighted one.
   * @returns The style attribute's value.
   */
  const cardStyle = (popular: boolean): string =>
    `position: relative; height: 100%; padding: ${
      popular ? '3rem 2.5rem 2.5rem' : '2.5rem 2rem'
    }; box-shadow: ${
      popular
        ? '0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 8px 16px -8px rgba(15, 23, 42, 0.08)'
        : '0 12px 24px -8px rgba(15, 23, 42, 0.10), 0 4px 8px -4px rgba(15, 23, 42, 0.06)'
    }`

  /** The "Most popular" tag's inline style. */
  const badgeStyle =
    'position: absolute; top: 1rem; right: 1rem; background-color: var(--color-accent-soft, #ffdf99); color: var(--color-on-accent-soft, #5a4300); padding: 0.25rem 0.6rem; border-radius: 999px; line-height: 1.2; z-index: 1'
</script>

{#snippet defaultLimits(limits: unknown)}
  {#if isObjectLimits(limits)}
    <ul class={cm.stack(2)}>
      {#each Object.entries(limits) as [key, value] (key)}
        <li
          class={cm.cn(cm.flex({ direction: 'row', align: 'start', gap: 'sm' }), cm.textSize('sm'))}
        >
          <Icon name="check-circle" size={16} className={cm.textSuccess} aria-hidden="true" />
          <span
            ><span class={cm.textMuted}>{`${billingLimitLabel(key, t)}: `}</span><span
              class={cm.fontWeight('medium')}>{billingLimitValue(value, t)}</span
            ></span
          >
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

{#if $loading}
  <section
    class={cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('py', 16), className)}
    data-mol-id="pricing-page"
  >
    <p class={cm.textMuted}>
      {t('billing.pricing.loading', undefined, { defaultValue: 'Loading plans…' })}
    </p>
  </section>
{:else if $error || !$data}
  <section
    class={cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('py', 16), className)}
    data-mol-id="pricing-page"
  >
    <p class={cm.formError}>
      {t('billing.pricing.error', undefined, {
        defaultValue: 'Could not load pricing. Try again later.',
      })}
    </p>
  </section>
{:else}
  <section
    class={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), className)}
    data-mol-id="pricing-page"
  >
    <!-- A `<section>`, not `<header>`: the app's own top bar is the page's
         single banner — a second header element here reads as a duplicate. -->
    <section class={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
      <h1
        class={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}
        style={headlineStyle}
        data-mol-id="pricing-page-heading"
      >
        {t(headingKey, undefined, { defaultValue: headingDefault })}
      </h1>
      {#if subheadingKey !== null}
        <p
          class={cm.cn(cm.textSize('lg'), cm.textMuted, cm.maxW('2xl'), cm.mxAuto)}
          data-mol-id="pricing-page-subheading"
        >
          {t(subheadingKey, undefined, { defaultValue: subheadingDefault })}
        </p>
      {/if}
    </section>
    <div
      class={cm.flex({
        direction: 'row',
        wrap: 'wrap',
        gap: 'lg',
        justify: 'center',
        align: 'stretch',
      })}
    >
      {#each tiers as tier (tier.key)}
        {@const price = priceFor(tier)}
        {@const popular = tier.key === resolvedPopularKey}
        <div style={wrapStyle(popular)}>
          <article
            class={cm.cn(
              cm.card({ variant: 'elevated' }),
              cm.flex({ direction: 'col' }),
              popular && cm.borderTPrimary,
            )}
            style={cardStyle(popular)}
            data-mol-id="pricing-tier-{tier.key}"
            data-popular={popular ? 'true' : undefined}
          >
            {#if popular}
              <span
                class={cm.cn(
                  cm.uppercase,
                  cm.trackingWide,
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                )}
                style={badgeStyle}
                data-mol-id="pricing-tier-{tier.key}-popular-badge"
              >
                {t('billing.pricing.mostPopular', undefined, { defaultValue: 'Most popular' })}
              </span>
            {/if}
            <!-- Card heading, not a page banner. -->
            <div class={cm.cardHeader}>
              {#if !popular}
                <p
                  class={cm.cn(
                    cm.textSize('xs'),
                    cm.textSubtle,
                    cm.fontWeight('semibold'),
                    cm.uppercase,
                    cm.trackingWide,
                    cm.sp('mb', 2),
                  )}
                  data-mol-id="pricing-tier-{tier.key}-eyebrow"
                >
                  {t('billing.pricing.tierEyebrow', undefined, { defaultValue: 'Tier' })}
                </p>
              {/if}
              <h2
                class={cm.cn(
                  cm.textSize('2xl'),
                  cm.italic,
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 4),
                )}
                style={headlineStyle}
              >
                {tier.name}
              </h2>
              <p>
                <span
                  class={cm.cn(
                    cm.textSize('5xl'),
                    cm.fontWeight('bold'),
                    popular && cm.textPrimary,
                  )}
                  style={headlineStyle}
                >
                  {price?.price ?? '—'}
                </span>{#if tier.perSeat}
                  <span class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.fontWeight('normal'))}
                    >{' ' +
                      t('billing.pricing.perSeat', undefined, { defaultValue: 'per seat' })}</span
                  >
                {/if}
              </p>
              <p
                class={cm.cn(
                  cm.textSize('xs'),
                  cm.textSubtle,
                  cm.fontWeight('semibold'),
                  cm.uppercase,
                  cm.trackingWide,
                  cm.sp('mt', 2),
                )}
              >
                {billingBilledLabel(price?.period ?? 'month', t)}{price?.savings
                  ? ' · '
                  : ''}{#if price?.savings}<span class={cm.textSuccess}
                    >{price.savings.toUpperCase()}</span
                  >{/if}
              </p>
            </div>
            <div class={cm.cn(cm.cardContent, cm.flex1)}>
              {#if renderLimits}
                {@render renderLimits(tier.limits)}
              {:else}
                {@render defaultLimits(tier.limits)}
              {/if}
            </div>
            <footer class={cm.cardFooter}>
              <button
                type="button"
                class={cm.cn(
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
                )}
                disabled={!price?.stripePriceId || $starting}
                onclick={() => handleUpgrade(price?.stripePriceId ?? null)}
                data-mol-id="pricing-cta-{tier.key}"
              >
                {#if price?.stripePriceId}
                  {t(
                    'billing.pricing.upgradeCta',
                    { tierName: tier.name },
                    { defaultValue: 'Upgrade to {{tierName}}' },
                  )}
                {:else}
                  {t('billing.pricing.currentCta', undefined, { defaultValue: 'Current plan' })}
                {/if}
              </button>
            </footer>
          </article>
        </div>
      {/each}
    </div>
    {#if $startError}
      <p class={cm.cn(cm.formError, cm.sp('mt', 6), cm.textCenter)} role="alert">
        {t('billing.pricing.checkoutError', undefined, {
          defaultValue: 'Could not start checkout. Please try again.',
        })}
      </p>
    {/if}
    <p
      class={cm.cn(cm.sp('mt', 10), cm.textCenter, cm.textSize('xs'), cm.textSubtle)}
      data-mol-id="pricing-page-reassurance"
    >
      {t('billing.pricing.reassurance', undefined, {
        defaultValue: 'Cancel anytime · No credit card required to start',
      })}
    </p>
  </section>
{/if}

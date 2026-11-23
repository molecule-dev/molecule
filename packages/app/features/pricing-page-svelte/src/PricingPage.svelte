<!--
  PricingPage: the Svelte counterpart of `@molecule/app-pricing-page-react`'s
  `PricingPage` — one card per tier, the optional monthly/yearly toggle and
  the Stripe Checkout CTA. Same props (React names), same DOM for the same
  input; the `renderLimits` render function is a snippet, called with the
  tier's limits.
-->
<script module lang="ts">
  /**
   * Formats a single tier-limit value as a display string.
   *
   * @param value - The raw value pulled out of the tier-limits object.
   * @returns A user-facing string ("✓", "—", "1,000", "∞", etc.).
   */
  export function formatLimitValue(value: unknown): string {
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
</script>

<script lang="ts">
  import {
    type PricingTierEntry,
    type PricingTierPrice,
    usePricingTiers,
    useStartCheckout,
  } from '@molecule/app-billing-svelte'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { PricingPagePeriod, PricingPageProps } from './types.js'

  let {
    tiers: providedTiers,
    onCheckout,
    showPeriodToggle = true,
    defaultPeriod = 'month',
    renderLimits,
    headingKey = 'pricingPage.heading',
    headingDefault = 'Choose your plan',
    className,
  }: PricingPageProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const {
    data: fetchedData,
    loading: fetchedLoading,
    error: fetchedError,
  } = usePricingTiers<unknown>()
  const { start, loading: starting, error: startError } = useStartCheckout()

  // React's useState default: the mount-time defaultPeriod only. The read
  // goes through a closure so the compiler sees an intentional initial value.
  const initialPeriod = (): PricingPagePeriod => defaultPeriod
  let period: PricingPagePeriod = $state(initialPeriod())

  /** Whether the page reads the fetched tiers rather than the `tiers` prop. */
  const usingFetched = $derived(providedTiers === undefined)
  /** The tiers the page renders, from the prop or the fetched response. */
  const tiers = $derived<PricingTierEntry<unknown>[] | null>(
    providedTiers ?? $fetchedData?.data ?? null,
  )
  /** Whether any tier carries a yearly price (the toggle needs one). */
  const hasYearly = $derived(
    (tiers ?? []).some((tier) => tier.prices.some((p) => p.period === 'year')),
  )

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
    if (onCheckout) {
      await onCheckout(tier, price)
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
   * The price a card shows for the page's period, falling back to the tier's first.
   *
   * @param tier - The tier to resolve a price for.
   * @returns The price, or undefined for a tier without any.
   */
  const priceFor = (tier: PricingTierEntry<unknown>): PricingTierPrice | undefined =>
    tier.prices.find((p) => p.period === period) ?? tier.prices[0]
</script>

{#snippet limitsList(limits: unknown)}
  {#if limits != null && typeof limits === 'object'}
    <dl>
      {#each Object.entries(limits) as [key, value] (key)}
        <div>
          <dt>{key}</dt>
          <dd>{formatLimitValue(value)}</dd>
        </div>
      {/each}
    </dl>
  {/if}
{/snippet}

{#snippet tierCard(tier: PricingTierEntry<unknown>)}
  {@const price = priceFor(tier)}
  <article class={cm.card({ variant: 'default' })} data-mol-id="pricing-page-tier-{tier.key}">
    <header class={cm.cardHeader}>
      <h2 class={cm.cardTitle}>{tier.name}</h2>
      <p class={cm.cardDescription}>
        {price?.price ?? '—'}{#if tier.perSeat}<span
            >{' ' + t('pricingPage.perSeat', undefined, { defaultValue: 'per seat' })}</span
          >{/if}
      </p>
      {#if price?.savings}<p class={cm.cardDescription}>{price.savings}</p>{/if}
    </header>
    <div class={cm.cardContent}>
      {#if renderLimits}
        {@render renderLimits?.(tier.limits)}
      {:else}
        {@render limitsList(tier.limits)}
      {/if}
    </div>
    <footer class={cm.cardFooter}>
      <button
        type="button"
        // Upgrade is a page-level CTA: same tier, colour and full width as
        // the identical action in `@molecule/app-billing-svelte`, so the two
        // pricing surfaces cannot drift apart.
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'lg', fullWidth: true }),
          cm.touchTargetCompact,
        )}
        disabled={!price?.stripePriceId || $starting}
        onclick={() => {
          if (price) void handleCheckout(tier, price)
        }}
        data-mol-id="pricing-page-cta-{tier.key}"
      >
        {#if price?.stripePriceId}
          {t(
            'pricingPage.upgradeCta',
            { tierName: tier.name },
            { defaultValue: 'Upgrade to {{tierName}}' },
          )}
        {:else}
          {t('pricingPage.currentCta', undefined, { defaultValue: 'Current plan' })}
        {/if}
      </button>
    </footer>
  </article>
{/snippet}

{#if usingFetched && $fetchedLoading && !tiers}
  <section class={className} data-mol-id="pricing-page-loading">
    <p>{t('pricingPage.loading', undefined, { defaultValue: 'Loading plans…' })}</p>
  </section>
{:else if usingFetched && ($fetchedError || !tiers)}
  <section class={className} data-mol-id="pricing-page-error">
    <p class={cm.formError} role="alert">
      {t('pricingPage.error', undefined, {
        defaultValue: 'Could not load pricing. Try again later.',
      })}
    </p>
  </section>
{:else}
  <section class={className} data-mol-id="pricing-page">
    <header class={cm.cardHeader}>
      <h1 class={cm.cardTitle}>
        {t(headingKey, undefined, { defaultValue: headingDefault })}
      </h1>
    </header>
    {#if showPeriodToggle && hasYearly}
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
          aria-selected={period === 'month'}
          class={cm.button({ variant: period === 'month' ? 'solid' : 'outline', size: 'sm' })}
          onclick={() => (period = 'month')}
          data-mol-id="pricing-page-period-month"
        >
          {t('pricingPage.periodToggle.monthly', undefined, { defaultValue: 'Monthly' })}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={period === 'year'}
          class={cm.button({ variant: period === 'year' ? 'solid' : 'outline', size: 'sm' })}
          onclick={() => (period = 'year')}
          data-mol-id="pricing-page-period-year"
        >
          {t('pricingPage.periodToggle.yearly', undefined, { defaultValue: 'Yearly' })}
        </button>
      </div>
    {/if}
    <div
      class={cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', justify: 'center' })}
      data-mol-id="pricing-page-grid"
    >
      {#each tiers ?? [] as tier (tier.key)}
        {@render tierCard(tier)}
      {/each}
    </div>
    {#if $startError}
      <p class={cm.formError} role="alert" data-mol-id="pricing-page-checkout-error">
        {t('pricingPage.checkoutError', undefined, {
          defaultValue: 'Could not start checkout. Please try again.',
        })}
      </p>
    {/if}
  </section>
{/if}

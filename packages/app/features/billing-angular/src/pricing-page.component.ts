/**
 * PricingPage component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import { useAuth, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-angular'

import { usePricingTiers, useStartCheckout } from './hooks.js'
import { billingBilledLabel, billingLimitLabel, billingLimitValue } from './labels.js'
import type { PricingPageProps, PricingTierEntry, PricingTierPrice } from './types.js'

/**
 * PricingPage component.
 *
 * The public pricing page: it fetches `/api/billing/tiers` on mount and lays
 * out one card per tier with the price for the selected period and a CTA that
 * starts a Stripe Checkout session via `/api/billing/checkout`. The host IS the
 * outer `<section>` React renders, so its class list and `data-mol-id` are host
 * bindings. The `renderLimits` render function arrives as a template (its
 * context carries the tier's limits as `$implicit` and `a0`).
 */
@Component({
  selector: 'section[mol-pricing-page]',
  standalone: true,
  imports: [Icon, NgTemplateOutlet],
  inputs: [
    'period',
    'renderLimits',
    'headingKey',
    'headingDefault',
    'subheadingKey',
    'subheadingDefault',
    'className',
    'unauthenticatedRedirect',
    'popularTierKey',
    'headlineFontFamily',
  ],
  host: {
    '[class]': 'rootClasses()',
    'data-mol-id': 'pricing-page',
  },
  // prettier-ignore
  template: `@if (tiersState.loading()) {
      <p [class]="cm.textMuted">{{ t('billing.pricing.loading', undefined, { defaultValue: 'Loading plans…' }) }}</p>
    } @else if (tiersState.error() || !tiersState.data()) {
      <p [class]="cm.formError">{{ t('billing.pricing.error', undefined, { defaultValue: 'Could not load pricing. Try again later.' }) }}</p>
    } @else {
      <!-- A \`<section>\`, not \`<header>\`: the app's own top bar is the page's
           single banner — a second header element here reads as a duplicate. -->
      <section [class]="cm.cn(cm.textCenter, cm.sp('mb', 10))">
        <h1 [class]="headingClasses()" [style]="headlineStyle()" data-mol-id="pricing-page-heading">{{ t(headingKey ?? 'billing.pricing.heading', undefined, { defaultValue: headingDefault ?? 'Choose your plan' }) }}</h1>
        @if (subheadingKey !== null) {
          <p [class]="subheadingClasses()" data-mol-id="pricing-page-subheading">{{ t(subheadingKey ?? 'billing.pricing.subheading', undefined, { defaultValue: subheadingDefault ?? 'Pick the plan that fits how you work. Upgrade or downgrade any time.' }) }}</p>
        }
      </section>
      <div [class]="cm.flex({ direction: 'row', wrap: 'wrap', gap: 'lg', justify: 'center', align: 'stretch' })">
        @for (tier of tiers(); track tier.key) {
          <div [style]="wrapStyle(isPopular(tier))">
            <article [class]="cardClasses(isPopular(tier))" [style]="cardStyle(isPopular(tier))" [attr.data-mol-id]="'pricing-tier-' + tier.key" [attr.data-popular]="isPopular(tier) ? 'true' : null">
              @if (isPopular(tier)) {
                <span [class]="badgeClasses()" [style]="badgeStyle" [attr.data-mol-id]="'pricing-tier-' + tier.key + '-popular-badge'">{{ t('billing.pricing.mostPopular', undefined, { defaultValue: 'Most popular' }) }}</span>
              }
              <!-- Card heading, not a page banner. -->
              <div [class]="cm.cardHeader">
                @if (!isPopular(tier)) {
                  <p [class]="eyebrowClasses()" [attr.data-mol-id]="'pricing-tier-' + tier.key + '-eyebrow'">{{ t('billing.pricing.tierEyebrow', undefined, { defaultValue: 'Tier' }) }}</p>
                }
                <h2 [class]="nameClasses()" [style]="headlineStyle()">{{ tier.name }}</h2>
                <p>
                  <span [class]="priceClasses(isPopular(tier))" [style]="headlineStyle()">{{ priceFor(tier)?.price ?? '—' }}</span>
                  @if (tier.perSeat) {
                    <span [class]="perSeatClasses()">{{ ' ' + t('billing.pricing.perSeat', undefined, { defaultValue: 'per seat' }) }}</span>
                  }
                </p>
                <p [class]="billedClasses()">{{ billedLabel(tier) }}@if (priceFor(tier)?.savings) {<ng-container>{{ ' · ' }}</ng-container><span [class]="cm.textSuccess">{{ savingsOf(tier) }}</span>}</p>
              </div>
              <div [class]="cm.cn(cm.cardContent, cm.flex1)">
                @if (renderLimits) {
                  <ng-container [ngTemplateOutlet]="renderLimits" [ngTemplateOutletContext]="limitsContext(tier.limits)" />
                } @else if (isObjectLimits(tier.limits)) {
                  <ul [class]="cm.stack(2)">
                    @for (entry of entries(tier.limits); track entry[0]) {
                      <li [class]="limitRowClasses()">
                        <svg mol-icon-root [name]="'check-circle'" [size]="16" [className]="cm.textSuccess" [ariaHidden]="'true'"></svg>
                        <span><span [class]="cm.textMuted">{{ limitLabel(entry[0]) }}: </span><span [class]="cm.fontWeight('medium')">{{ limitValue(entry[1]) }}</span></span>
                      </li>
                    }
                  </ul>
                }
              </div>
              <footer [class]="cm.cardFooter">
                <button type="button" [class]="ctaButtonClasses(isPopular(tier))" [disabled]="!priceFor(tier)?.stripePriceId || startState.loading()" (click)="handleUpgrade(tier)" [attr.data-mol-id]="'pricing-cta-' + tier.key">{{ ctaLabel(tier) }}</button>
              </footer>
            </article>
          </div>
        }
      </div>
      @if (startState.error()) {
        <p [class]="cm.cn(cm.formError, cm.sp('mt', 6), cm.textCenter)" role="alert">{{ t('billing.pricing.checkoutError', undefined, { defaultValue: 'Could not start checkout. Please try again.' }) }}</p>
      }
      <p [class]="reassuranceClasses()" data-mol-id="pricing-page-reassurance">{{ t('billing.pricing.reassurance', undefined, { defaultValue: 'Cancel anytime · No credit card required to start' }) }}</p>
    }`,
})
export class PricingPage implements PricingPageProps {
  /** Optional billing-period selector (React's `'month'` default applies at read time). */
  period?: PricingTierPrice['period']

  /**
   * Optional template for the tier-specific limits column (React's
   * `renderLimits` render function). Its context carries the tier's limits as
   * `$implicit` and `a0`.
   */
  renderLimits?: TemplateRef<unknown> | null

  /** Optional override for the page-level heading translation key. */
  headingKey?: string
  /** Optional English fallback for the heading. */
  headingDefault?: string
  /** Optional sub-heading key; pass `null` to suppress the sub-heading. */
  subheadingKey?: string | null
  /** English fallback for the sub-heading. */
  subheadingDefault?: string
  /** Optional className applied to the outer wrapper. */
  className?: string
  /** Path an anonymous visitor is sent to after a failed checkout (default `/login`). */
  unauthenticatedRedirect?: string | null
  /** Optional tier key to highlight; `null` disables highlighting. */
  popularTierKey?: string | null
  /** Optional inline headline font; `null` inherits from the theme. */
  headlineFontFamily?: string | null

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The auth composable — the session state as a signal. */
  private readonly auth = useAuth()

  /** The public tier list. */
  protected readonly tiersState = usePricingTiers()

  /** The checkout action and its async state. */
  protected readonly startState = useStartCheckout()

  /** The "Most popular" tag's inline style. */
  protected readonly badgeStyle =
    'position: absolute; top: 1rem; right: 1rem; background-color: var(--color-accent-soft, #ffdf99); color: var(--color-on-accent-soft, #5a4300); padding: 0.25rem 0.6rem; border-radius: 999px; line-height: 1.2; z-index: 1'

  /**
   * The page's billing period (React's `'month'` default).
   *
   * @returns The selected period.
   */
  periodValue(): PricingTierPrice['period'] {
    return this.period ?? 'month'
  }

  /**
   * The outer `<section>`'s class list, which differs between the loading,
   * error and loaded states exactly as React's three returns do.
   *
   * @returns The class string for the host.
   */
  rootClasses(): string {
    if (this.tiersState.loading())
      return this.cm.cn(
        this.cm.maxW('xl'),
        this.cm.mxAuto,
        this.cm.textCenter,
        this.cm.sp('py', 16),
        this.className,
      )
    if (this.tiersState.error() || !this.tiersState.data())
      return this.cm.cn(
        this.cm.maxW('xl'),
        this.cm.mxAuto,
        this.cm.textCenter,
        this.cm.sp('py', 16),
        this.className,
      )
    return this.cm.cn(
      this.cm.maxW('6xl'),
      this.cm.mxAuto,
      this.cm.sp('px', 6),
      this.cm.sp('py', 12),
      this.className,
    )
  }

  /**
   * The inline headline font, or null when the caller disabled it.
   *
   * @returns The style attribute text.
   */
  headlineStyle(): string | null {
    const font = this.headlineFontFamily
    if (font === null) return null
    return `font-family: ${font ?? 'var(--font-headline, inherit)'}`
  }

  /**
   * The tiers in presentation order, the popular one centred.
   *
   * @returns The tiers as the page renders them.
   */
  tiers(): PricingTierEntry<unknown>[] {
    return centerPopularTier(this.tiersState.data()?.data ?? [], this.resolvedPopularKey())
  }

  /**
   * The tier key highlighted as "most popular" (React's auto-pick unless the
   * caller overrides it, and none when the caller passes `null`).
   *
   * @returns The popular tier's key, or null.
   */
  resolvedPopularKey(): string | null {
    if (this.popularTierKey === null) return null
    return (
      this.popularTierKey ??
      autoSelectPopular(this.tiersState.data()?.data ?? [], this.periodValue())
    )
  }

  /**
   * Whether a tier is the highlighted one.
   *
   * @param tier - The tier to test.
   * @returns True when the tier is the popular one.
   */
  isPopular(tier: PricingTierEntry<unknown>): boolean {
    return tier.key === this.resolvedPopularKey()
  }

  /**
   * The price a card shows for the page's period, falling back to the tier's first.
   *
   * @param tier - The tier to resolve a price for.
   * @returns The price, or undefined for a tier without any.
   */
  priceFor(tier: PricingTierEntry<unknown>): PricingTierPrice | undefined {
    return tier.prices.find((p) => p.period === this.periodValue()) ?? tier.prices[0]
  }

  /**
   * The localized "billed" line for a tier's price (React's `'month'` fallback).
   *
   * @param tier - The tier to label.
   * @returns The translated line.
   */
  billedLabel(tier: PricingTierEntry<unknown>): string {
    return billingBilledLabel(this.priceFor(tier)?.period ?? 'month', this.t)
  }

  /**
   * The upper-cased savings tag of a tier's price.
   *
   * @param tier - The tier to read.
   * @returns The savings tag, upper-cased.
   */
  savingsOf(tier: PricingTierEntry<unknown>): string {
    return (this.priceFor(tier)?.savings ?? '').toUpperCase()
  }

  /**
   * The CTA's label: the upgrade call to action, or "Current plan" for a tier
   * without a Stripe price.
   *
   * @param tier - The tier whose CTA renders.
   * @returns The translated label.
   */
  ctaLabel(tier: PricingTierEntry<unknown>): string {
    if (this.priceFor(tier)?.stripePriceId)
      return this.t(
        'billing.pricing.upgradeCta',
        { tierName: tier.name },
        { defaultValue: 'Upgrade to {{tierName}}' },
      )
    return this.t('billing.pricing.currentCta', undefined, { defaultValue: 'Current plan' })
  }

  /**
   * The template context a `renderLimits` call receives (React passes the
   * tier's limits as its only argument).
   *
   * @param limits - The tier's limits.
   * @returns The `ngTemplateOutlet` context.
   */
  limitsContext(limits: unknown): { $implicit: unknown; a0: unknown } {
    return { $implicit: limits, a0: limits }
  }

  /**
   * Whether a limits value is an object the default rows can enumerate.
   *
   * @param limits - The tier's limits value.
   * @returns True for a non-null object.
   */
  isObjectLimits(limits: unknown): limits is Record<string, unknown> {
    return limits != null && typeof limits === 'object'
  }

  /**
   * The entries of a limits object, in insertion order.
   *
   * @param limits - The tier's limits object.
   * @returns Its `[key, value]` pairs.
   */
  entries(limits: Record<string, unknown>): [string, unknown][] {
    return Object.entries(limits)
  }

  /**
   * The outer wrapper's inline style, which keeps the popular tier physically
   * larger (taller + wider) than its neighbors.
   *
   * @param popular - Whether this card is the highlighted one.
   * @returns The style attribute text.
   */
  wrapStyle(popular: boolean): string {
    return `position: relative; width: ${popular ? '24rem' : '19rem'}; margin-top: ${
      popular ? '-1.5rem' : '0'
    }; margin-bottom: ${popular ? '-1.5rem' : '0'}`
  }

  /**
   * The card's inline style: editorial padding and the soft shadow that lifts
   * it off any same-colored page background.
   *
   * @param popular - Whether this card is the highlighted one.
   * @returns The style attribute text.
   */
  cardStyle(popular: boolean): string {
    return `position: relative; height: 100%; padding: ${
      popular ? '3rem 2.5rem 2.5rem' : '2.5rem 2rem'
    }; box-shadow: ${
      popular
        ? '0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 8px 16px -8px rgba(15, 23, 42, 0.08)'
        : '0 12px 24px -8px rgba(15, 23, 42, 0.10), 0 4px 8px -4px rgba(15, 23, 42, 0.06)'
    }`
  }

  /**
   * The card's class list.
   *
   * @param popular - Whether this card is the highlighted one.
   * @returns The class string.
   */
  cardClasses(popular: boolean): string {
    return this.cm.cn(
      this.cm.card({ variant: 'elevated' }),
      this.cm.flex({ direction: 'col' }),
      popular && this.cm.borderTPrimary,
    )
  }

  /**
   * The "Most popular" tag's class list.
   *
   * @returns The class string.
   */
  badgeClasses(): string {
    return this.cm.cn(
      this.cm.uppercase,
      this.cm.trackingWide,
      this.cm.fontWeight('bold'),
      this.cm.textSize('xs'),
    )
  }

  /**
   * The tier eyebrow's class list.
   *
   * @returns The class string.
   */
  eyebrowClasses(): string {
    return this.cm.cn(
      this.cm.textSize('xs'),
      this.cm.textSubtle,
      this.cm.fontWeight('semibold'),
      this.cm.uppercase,
      this.cm.trackingWide,
      this.cm.sp('mb', 2),
    )
  }

  /**
   * The tier name's class list.
   *
   * @returns The class string.
   */
  nameClasses(): string {
    return this.cm.cn(
      this.cm.textSize('2xl'),
      this.cm.italic,
      this.cm.fontWeight('semibold'),
      this.cm.sp('mb', 4),
    )
  }

  /**
   * The hero price's class list.
   *
   * @param popular - Whether this card is the highlighted one.
   * @returns The class string.
   */
  priceClasses(popular: boolean): string {
    return this.cm.cn(
      this.cm.textSize('5xl'),
      this.cm.fontWeight('bold'),
      popular && this.cm.textPrimary,
    )
  }

  /**
   * The per-seat tag's class list.
   *
   * @returns The class string.
   */
  perSeatClasses(): string {
    return this.cm.cn(this.cm.textSize('sm'), this.cm.textMuted, this.cm.fontWeight('normal'))
  }

  /**
   * The billed line's class list.
   *
   * @returns The class string.
   */
  billedClasses(): string {
    return this.cm.cn(
      this.cm.textSize('xs'),
      this.cm.textSubtle,
      this.cm.fontWeight('semibold'),
      this.cm.uppercase,
      this.cm.trackingWide,
      this.cm.sp('mt', 2),
    )
  }

  /**
   * One default limit row's class list.
   *
   * @returns The class string.
   */
  limitRowClasses(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'row', align: 'start', gap: 'sm' }),
      this.cm.textSize('sm'),
    )
  }

  /**
   * The CTA's extra class list (React merges these after the button token).
   *
   * @param popular - Whether this card is the highlighted one.
   * @returns The class string.
   */
  ctaClasses(popular: boolean): string {
    return this.cm.cn(
      popular && this.cm.gradientPrimary,
      this.cm.uppercase,
      this.cm.trackingWide,
      this.cm.fontWeight('semibold'),
      this.cm.touchTargetCompact,
    )
  }

  /**
   * The CTA's full class list: React's `cm.button({...})` token plus the
   * page's own tokens.
   *
   * @param popular - Whether this card is the highlighted one.
   * @returns The class string.
   */
  ctaButtonClasses(popular: boolean): string {
    return this.cm.cn(
      this.cm.button({
        variant: popular ? 'solid' : 'outline',
        color: popular ? 'primary' : undefined,
        size: 'lg',
        fullWidth: true,
      }),
      this.ctaClasses(popular),
    )
  }

  /**
   * A default limit row's label: the limit key through `t()`
   * (`billing.pricing.limit.<key>`), with the humanized English as the
   * fallback for a key the locale bond does not carry.
   *
   * @param key - The limits object's key.
   * @returns The localized label.
   */
  limitLabel(key: string): string {
    return billingLimitLabel(key, this.t)
  }

  /**
   * A default limit row's value: the display string, with the unlimited
   * sentinel through `t()`.
   *
   * @param value - The limit's value.
   * @returns The display string.
   */
  limitValue(value: unknown): string {
    return billingLimitValue(value, this.t)
  }

  /**
   * The page heading's class list.
   *
   * @returns The class string.
   */
  headingClasses(): string {
    return this.cm.cn(this.cm.textSize('4xl'), this.cm.fontWeight('bold'), this.cm.sp('mb', 3))
  }

  /**
   * The page sub-heading's class list.
   *
   * @returns The class string.
   */
  subheadingClasses(): string {
    return this.cm.cn(
      this.cm.textSize('lg'),
      this.cm.textMuted,
      this.cm.maxW('2xl'),
      this.cm.mxAuto,
    )
  }

  /**
   * The reassurance line's class list.
   *
   * @returns The class string.
   */
  reassuranceClasses(): string {
    return this.cm.cn(
      this.cm.sp('mt', 10),
      this.cm.textCenter,
      this.cm.textSize('xs'),
      this.cm.textSubtle,
    )
  }

  /**
   * Posts one price to the checkout endpoint and follows its handoff: the
   * provider's checkout URL, an in-place update, or (for an anonymous visitor
   * whose POST failed) the app's login route.
   *
   * @param tier - The tier whose CTA was clicked.
   */
  async handleUpgrade(tier: PricingTierEntry<unknown>): Promise<void> {
    const priceId = this.priceFor(tier)?.stripePriceId ?? null
    if (!priceId) return
    // Always fire the POST so the API is the source of truth for auth and
    // entitlement gating. Redirect anonymous visitors only AFTER the POST
    // resolves (or fails), so the request is always observable.
    const response = await this.startState.start(priceId)
    const redirect = this.unauthenticatedRedirect ?? '/login'
    if (!response) {
      if (!this.auth.isAuthenticated() && redirect && typeof window !== 'undefined') {
        window.location.assign(redirect)
      }
      return
    }
    if (response.checkoutUrl) {
      window.location.assign(response.checkoutUrl)
    } else if (response.updated) {
      window.location.reload()
    }
  }
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

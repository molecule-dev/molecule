/**
 * PricingPage component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type OnInit, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import {
  type PricingTierEntry,
  type PricingTierPrice,
  usePricingTiers,
  useStartCheckout,
} from '@molecule/app-billing-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { PricingPagePeriod, PricingPageProps } from './types.js'

/**
 * PricingPage component.
 *
 * Drop-in pricing page: one card per tier from `tiers` (or
 * `usePricingTiers()` when not supplied), with an optional monthly/yearly
 * toggle and a Stripe Checkout CTA per card. The host IS the outer
 * `<section>` React renders, so its class list and state-dependent
 * `data-mol-id` are host bindings. The `renderLimits` render function
 * arrives as a template (its context carries the tier's limits as
 * `$implicit` and `a0`).
 *
 * This is the Angular counterpart of `@molecule/app-pricing-page-react`'s
 * `PricingPage`.
 */
@Component({
  selector: 'section[mol-pricing-page]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'tiers',
    'onCheckout',
    'showPeriodToggle',
    'defaultPeriod',
    'renderLimits',
    'headingKey',
    'headingDefault',
    'className',
  ],
  host: {
    '[class]': 'className ?? null',
    '[attr.data-mol-id]': 'molId()',
  },
  // prettier-ignore
  template: `
    @if (showLoading()) {
      <p>{{ t('pricingPage.loading', undefined, { defaultValue: 'Loading plans…' }) }}</p>
    } @else if (showError()) {
      <p [class]="cm.formError" role="alert">{{ t('pricingPage.error', undefined, { defaultValue: 'Could not load pricing. Try again later.' }) }}</p>
    } @else {
      <header [class]="cm.cardHeader">
        <h1 [class]="cm.cardTitle">{{ t(headingKey ?? 'pricingPage.heading', undefined, { defaultValue: headingDefault ?? 'Choose your plan' }) }}</h1>
      </header>
      @if (showPeriodToggle !== false && hasYearly()) {
        <div [class]="cm.flex({ direction: 'row', gap: 'sm', justify: 'center' })" data-mol-id="pricing-page-period-toggle" role="tablist" [attr.aria-label]="t('pricingPage.periodToggle.label', undefined, { defaultValue: 'Billing period' })">
          <button type="button" role="tab" [attr.aria-selected]="period === 'month'" [class]="cm.button({ variant: period === 'month' ? 'solid' : 'outline', size: 'sm' })" (click)="period = 'month'" data-mol-id="pricing-page-period-month">{{ t('pricingPage.periodToggle.monthly', undefined, { defaultValue: 'Monthly' }) }}</button>
          <button type="button" role="tab" [attr.aria-selected]="period === 'year'" [class]="cm.button({ variant: period === 'year' ? 'solid' : 'outline', size: 'sm' })" (click)="period = 'year'" data-mol-id="pricing-page-period-year">{{ t('pricingPage.periodToggle.yearly', undefined, { defaultValue: 'Yearly' }) }}</button>
        </div>
      }
      <div [class]="cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', justify: 'center' })" data-mol-id="pricing-page-grid">
        @for (tier of tiersList(); track tier.key) {
          <article [class]="cm.card({ variant: 'default' })" [attr.data-mol-id]="'pricing-page-tier-' + tier.key">
            <header [class]="cm.cardHeader">
              <h2 [class]="cm.cardTitle">{{ tier.name }}</h2>
              <p [class]="cm.cardDescription">{{ priceFor(tier)?.price ?? '—' }}@if (tier.perSeat) {<span>{{ ' ' + t('pricingPage.perSeat', undefined, { defaultValue: 'per seat' }) }}</span>}</p>
              @if (priceFor(tier)?.savings) {
                <p [class]="cm.cardDescription">{{ priceFor(tier)?.savings }}</p>
              }
            </header>
            <div [class]="cm.cardContent">
              @if (renderLimits) {
                <ng-container [ngTemplateOutlet]="renderLimits" [ngTemplateOutletContext]="limitsContext(tier.limits)" />
              } @else if (isObjectLimits(tier.limits)) {
                <dl>
                  @for (entry of entries(tier.limits); track entry[0]) {
                    <div>
                      <dt>{{ entry[0] }}</dt>
                      <dd>{{ limitValue(entry[1]) }}</dd>
                    </div>
                  }
                </dl>
              }
            </div>
            <footer [class]="cm.cardFooter">
              <button type="button" [class]="cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'lg', fullWidth: true }), cm.touchTargetCompact)" [disabled]="!priceFor(tier)?.stripePriceId || startState.loading()" (click)="fireCheckout(tier)" [attr.data-mol-id]="'pricing-page-cta-' + tier.key">@if (priceFor(tier)?.stripePriceId) {{{ t('pricingPage.upgradeCta', { tierName: tier.name }, { defaultValue: 'Upgrade to {{tierName}}' }) }}}@else {{{ t('pricingPage.currentCta', undefined, { defaultValue: 'Current plan' }) }}}</button>
            </footer>
          </article>
        }
      </div>
      @if (startState.error()) {
        <p [class]="cm.formError" role="alert" data-mol-id="pricing-page-checkout-error">{{ t('pricingPage.checkoutError', undefined, { defaultValue: 'Could not start checkout. Please try again.' }) }}</p>
      }
    }
  `,
})
export class PricingPage implements OnInit, PricingPageProps {
  /**
   * Optional pre-fetched tiers. When omitted the component fetches them
   * via `usePricingTiers()` (which calls `GET /api/billing/tiers`).
   */
  tiers?: PricingTierEntry<unknown>[]

  /**
   * Optional override for the checkout handler. The default posts to
   * `/api/billing/checkout` via `useStartCheckout()` and redirects the
   * browser to the returned `checkoutUrl`.
   */
  onCheckout?: (tier: PricingTierEntry<unknown>, price: PricingTierPrice) => void | Promise<void>

  /** When true (default), renders a monthly/yearly toggle. */
  showPeriodToggle?: boolean

  /** Default billing period for the toggle. Defaults to `'month'`. */
  defaultPeriod?: PricingPagePeriod

  /**
   * Optional template for the tier-specific limits block (React's
   * `renderLimits`; its context carries the tier's limits as `$implicit`
   * and `a0`).
   */
  renderLimits?: TemplateRef<unknown> | null

  /** Optional translation key for the page heading. */
  headingKey?: string

  /** Optional English fallback for the heading. */
  headingDefault?: string

  /** Optional className applied to the outer wrapper (the host element). */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The public tier list (`GET /api/billing/tiers`, fired on mount). */
  protected readonly tiersState = usePricingTiers<unknown>()

  /** The checkout action and its async state. */
  protected readonly startState = useStartCheckout()

  /** The mounted billing period (React's `useState(defaultPeriod)` initial). */
  protected period: PricingPagePeriod = 'month'

  /**
   * Reads the initial period from the `defaultPeriod` input, which Angular
   * assigns before `ngOnInit` (React reads it once at mount).
   */
  ngOnInit(): void {
    this.period = this.defaultPeriod ?? 'month'
  }

  /**
   * Whether the page reads the fetched tiers rather than the `tiers` prop.
   *
   * @returns True when no `tiers` input is set.
   */
  usingFetched(): boolean {
    return this.tiers === undefined
  }

  /**
   * The tiers the page renders, from the prop or the fetched response.
   *
   * @returns The tier list, or null while the fetched read has none.
   */
  tiersList(): PricingTierEntry<unknown>[] | null {
    return this.tiers ?? this.tiersState.data()?.data ?? null
  }

  /**
   * Whether the loading line shows (React's first early return).
   *
   * @returns True while the fetched read is pending with nothing to render.
   */
  showLoading(): boolean {
    return this.usingFetched() && this.tiersState.loading() && !this.tiersList()
  }

  /**
   * Whether the error line shows (React's second early return).
   *
   * @returns True when the fetched read failed with nothing to render.
   */
  showError(): boolean {
    return this.usingFetched() && (this.tiersState.error() != null || !this.tiersList())
  }

  /**
   * The host's `data-mol-id`, which follows the state React's three returns
   * name.
   *
   * @returns The `data-mol-id` for the current state.
   */
  molId(): string {
    if (this.showLoading()) return 'pricing-page-loading'
    if (this.showError()) return 'pricing-page-error'
    return 'pricing-page'
  }

  /**
   * Whether any tier carries a yearly price (the toggle needs one).
   *
   * @returns True when a yearly price exists.
   */
  hasYearly(): boolean {
    return (this.tiersList() ?? []).some((tier) => tier.prices.some((p) => p.period === 'year'))
  }

  /**
   * The price a card shows for the page's period, falling back to the tier's first.
   *
   * @param tier - The tier to resolve a price for.
   * @returns The price, or undefined for a tier without any.
   */
  priceFor(tier: PricingTierEntry<unknown>): PricingTierPrice | undefined {
    return tier.prices.find((p) => p.period === this.period) ?? tier.prices[0]
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
   * A default limit row's value: the display string ("✓", "—", "1,000",
   * "∞", etc.), exactly as React's `formatLimitValue` formats it.
   *
   * @param value - The limit's raw value.
   * @returns The display string.
   */
  limitValue(value: unknown): string {
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
   * The card CTA's click handler: React's `onClick={() => price && onCheckout(tier, price)}`.
   *
   * @param tier - The tier whose CTA was clicked.
   */
  fireCheckout(tier: PricingTierEntry<unknown>): void {
    const price = this.priceFor(tier)
    if (price) void this.handleCheckout(tier, price)
  }

  /**
   * Internal default checkout handler — posts to `/api/billing/checkout`
   * and either navigates to `checkoutUrl` or reloads on in-place update.
   *
   * @param tier - The tier the user selected.
   * @param price - The selected price for that tier.
   */
  private async handleCheckout(
    tier: PricingTierEntry<unknown>,
    price: PricingTierPrice,
  ): Promise<void> {
    if (!price.stripePriceId) return
    if (this.onCheckout) {
      await this.onCheckout(tier, price)
      return
    }
    const response = await this.startState.start(price.stripePriceId)
    if (response?.checkoutUrl && typeof window !== 'undefined') {
      window.location.assign(response.checkoutUrl)
    } else if (response?.updated && typeof window !== 'undefined') {
      window.location.reload()
    }
  }
}

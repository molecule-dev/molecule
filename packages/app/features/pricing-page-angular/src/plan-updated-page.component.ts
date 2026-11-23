/**
 * PlanUpdatedPage component (React parity).
 *
 * @module
 */

import type { ElementRef } from '@angular/core'
import { Component, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { PlanUpdatedPageProps } from './types.js'

/**
 * PlanUpdatedPage component.
 *
 * Post-checkout success page. Rendered after Stripe redirects the user back
 * from Checkout (the standard `success_url` route in mlcl flagship apps).
 * The host IS the outer `<section>` React renders, so its class list and
 * `data-mol-id` are host bindings. The node-valued `ctaLabel` prop is
 * projected content (`[slot=ctaLabel]`) or a plain string input.
 *
 * This is the Angular counterpart of `@molecule/app-pricing-page-react`'s
 * `PlanUpdatedPage`.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture point mounted, so the CTA
 * footer stays in the template and leaves the page while the label has nothing
 * to render; the placement function re-decides it whenever the slot changes
 * (React would not render it at all).
 */
@Component({
  selector: 'section[mol-plan-updated-page]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['planName', 'ctaLabel', 'onCta', 'ctaHref', 'className'],
  host: {
    '[class]': 'className ?? null',
    'data-mol-id': 'plan-updated-page',
  },
  // prettier-ignore
  template: `
    <header [class]="cm.cardHeader">
      <h1 [class]="cm.cardTitle">@if (planName) {{{ t('pricingPage.planUpdated.headingNamed', { planName: planName }, { defaultValue: "You're now on the {{planName}} plan" }) }}}@else {{{ t('pricingPage.planUpdated.heading', undefined, { defaultValue: 'Your plan has been updated' }) }}}</h1>
      <p [class]="cm.cardDescription">{{ t('pricingPage.planUpdated.body', undefined, { defaultValue: 'Thanks for upgrading. Your new plan is active immediately and a receipt has been emailed to you.' }) }}</p>
    </header>
    <footer #footerEl [class]="cm.cardFooter">
      @if (ctaHref) {
        <a [href]="ctaHref" [class]="cm.button({ variant: 'solid', size: 'md' })" data-mol-id="plan-updated-cta" #ctaLabelEl>@if (hasCtaLabel) {{{ ctaLabel }}}<ng-content select="[slot=ctaLabel]" /></a>
      } @else {
        <button type="button" [class]="cm.button({ variant: 'solid', size: 'md' })" (click)="fireCta($event)" data-mol-id="plan-updated-cta" #ctaLabelEl>@if (hasCtaLabel) {{{ ctaLabel }}}<ng-content select="[slot=ctaLabel]" /></button>
      }
    </footer>
  `,
})
export class PlanUpdatedPage implements PlanUpdatedPageProps {
  /**
   * Optional new plan name to include in the heading (e.g. `'Pro'`).
   * When omitted, a generic heading is rendered.
   */
  planName?: string

  /**
   * Optional CTA label. A string input renders as text; `[slot=ctaLabel]`
   * projected content renders in its place.
   */
  ctaLabel?: string

  /** Click handler for the CTA. Mutually exclusive with `ctaHref`. */
  onCta?: (event: unknown) => void

  /** Anchor target for the CTA. Mutually exclusive with `onCta`. */
  ctaHref?: string

  /** Optional className applied to the outer wrapper (the host element). */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The CTA's footer (present while the label renders). */
  @ViewChild('footerEl', { static: true }) private footerEl?: ElementRef<HTMLElement>
  /** The CTA's label region: the anchor or the button (inside the `ctaHref` branch). */
  @ViewChild('ctaLabelEl') private ctaLabelEl?: ElementRef<HTMLElement>

  /**
   * Whether a `[slot=ctaLabel]` projection landed: placement decides, so a
   * label taken away and given back returns.
   */
  private readonly ctaShown = signal(false)

  /**
   * Keeps the CTA footer on the page only while the label renders a text input
   * or projected `[slot=ctaLabel]` content, re-decided whenever either changes.
   */
  constructor() {
    usePlacement((hasContent) => {
      const ctaLabelEl = this.ctaLabelEl?.nativeElement
      const showCta = this.hasCtaLabel || (ctaLabelEl ? hasContent(ctaLabelEl) : false)
      this.ctaShown.set(showCta)
      setElementPresent(this.footerEl?.nativeElement, showCta)
    })
  }

  /**
   * Whether a text CTA label input renders (a projected label is not).
   *
   * @returns True when the label renders as text.
   */
  get hasCtaLabel(): boolean {
    return this.ctaLabel !== undefined && this.ctaLabel !== null && this.ctaLabel !== ''
  }

  /**
   * Whether the CTA renders: a truthy string input or a projected
   * `[slot=ctaLabel]` element.
   *
   * @returns True when the CTA shows.
   */
  get showCta(): boolean {
    return this.hasCtaLabel || this.ctaShown()
  }

  /**
   * Passes the click event to the caller's handler, as React's
   * `onClick={onCta}` does.
   *
   * @param event - The DOM click event.
   */
  fireCta(event: unknown): void {
    this.onCta?.(event)
  }
}

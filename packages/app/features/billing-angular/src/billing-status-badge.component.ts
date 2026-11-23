/**
 * BillingStatusBadge component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { useBillingStatus, useCancelSubscription } from './hooks.js'
import type { BillingStatusBadgeProps } from './types.js'

/**
 * BillingStatusBadge component.
 *
 * Compact billing-status display for the user's account/settings page: the
 * current tier name and a cancel button on paid tiers. React's root varies
 * (`<span>` while loading, nothing without a status, `<div>` otherwise), so
 * the rendered root stands in front of the host's place and the host itself
 * leaves the page (`placeElementBefore` + `setElementPresent`): nothing left
 * over when React renders nothing.
 */
@Component({
  selector: 'mol-billing-status-badge',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['onCanceled', 'className', 'showCancel'],
  // prettier-ignore
  template: `@if (status.loading()) {
      <span #loadingRoot [class]="className" data-mol-id="billing-status-loading">{{ t('billing.status.loading', undefined, { defaultValue: 'Loading…' }) }}</span>
    } @else if (status.error() === null && status.data()) {
      <div #statusRoot [class]="className" data-mol-id="billing-status">
        <span [class]="cm.cardDescription">{{ currentPlanLabel() }}</span>
        @if (showsCancel()) {
          <button
            type="button"
            [class]="cancelClasses()"
            [disabled]="cancelState.loading()"
            (click)="handleCancel()"
            data-mol-id="billing-cancel-button"
          >
            {{ t('billing.status.cancelCta', undefined, { defaultValue: 'Cancel subscription' }) }}
          </button>
        }
        @if (cancelState.error()) {
          <p [class]="cm.formError" role="alert">
            {{
              t('billing.status.cancelError', undefined, {
                defaultValue: 'Could not cancel. Please try again.',
              })
            }}
          </p>
        }
      </div>
    }`,
})
export class BillingStatusBadge implements BillingStatusBadgeProps {
  /**
   * Optional callback invoked after a successful cancel. Most apps will
   * navigate the user back to settings or refresh the page from here.
   */
  onCanceled?: () => void

  /** Optional className applied to the outer wrapper. */
  className?: string

  /**
   * Whether to render the cancel-subscription button when the user is on a
   * paid tier. Defaults to `true`.
   */
  showCancel?: boolean

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The signed-in user's billing status. */
  protected readonly status = useBillingStatus()

  /** The cancel action and its async state. */
  protected readonly cancelState = useCancelSubscription()

  /** React's loading root (`<span>`), while the status is loading. */
  @ViewChild('loadingRoot') private loadingRoot?: ElementRef<HTMLElement>
  /** React's loaded root (`<div>`), while a status is shown. */
  @ViewChild('statusRoot') private statusRoot?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root varies with the load state and is nothing without a status: whichever
    // root renders stands in front of the host's place, and the host itself leaves the page.
    usePlacement(() => {
      const root = this.loadingRoot?.nativeElement ?? this.statusRoot?.nativeElement
      if (root) placeElementBefore(root, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * The translated "Current plan: <tier>" line.
   *
   * @returns The translated label.
   */
  currentPlanLabel(): string {
    return this.t(
      'billing.status.currentPlan',
      { tierName: this.status.data()?.name ?? '' },
      { defaultValue: 'Current plan: {{tierName}}' },
    )
  }

  /**
   * Whether the cancel button renders (React's `showCancel = true` default,
   * and never on the free tier).
   *
   * @returns True for a paid tier when the caller has not disabled it.
   */
  showsCancel(): boolean {
    const free = this.status.data()?.isFree ?? false
    return (this.showCancel ?? true) && !free
  }

  /**
   * The cancel button's class list (React's `cm.button({ variant: 'outline', size: 'sm' })`).
   *
   * @returns The class string.
   */
  cancelClasses(): string {
    return this.cm.button({ variant: 'outline', size: 'sm' })
  }

  /** Cancels the subscription and reports a confirmed cancellation. */
  async handleCancel(): Promise<void> {
    const result = await this.cancelState.cancel()
    if (result?.canceled) this.onCanceled?.()
  }
}

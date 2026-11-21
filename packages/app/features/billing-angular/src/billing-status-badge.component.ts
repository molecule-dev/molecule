/**
 * BillingStatusBadge component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
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
 * the host is an empty, layout-neutral element (`display: contents`) that the
 * DOM normalizer unwraps — the convention the UI kit's fragment-rooted
 * Angular components use.
 */
@Component({
  selector: 'mol-billing-status-badge',
  standalone: true,
  inputs: ['onCanceled', 'className', 'showCancel'],
  host: { 'data-parity-unwrap': '', style: 'display: contents' },
  // prettier-ignore
  template: `@if (status.loading()) {
      <span [class]="className" data-mol-id="billing-status-loading">{{ t('billing.status.loading', undefined, { defaultValue: 'Loading…' }) }}</span>
    } @else if (status.error() === null && status.data()) {
      <div [class]="className" data-mol-id="billing-status">
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

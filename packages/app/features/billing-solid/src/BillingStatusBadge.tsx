/**
 * Solid billing-status badge: the current tier and its cancel action.
 *
 * Solid counterpart of `@molecule/app-billing-react`'s
 * `BillingStatusBadge` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useBillingStatus, useCancelSubscription } from './hooks.js'

/** Props for `<BillingStatusBadge />`. */
export interface BillingStatusBadgeProps {
  /**
   * Optional callback invoked after a successful cancel. Most apps will
   * navigate the user back to settings or refresh the page from here.
   */
  onCanceled?: () => void

  /** Optional className applied to the outer wrapper. */
  className?: string

  /**
   * Whether to render the cancel-subscription button when the user is
   * on a paid tier. Defaults to `true`.
   */
  showCancel?: boolean
}

/**
 * Compact billing-status display for the user's account/settings page.
 * Shows the current tier name and offers a cancel button on paid tiers.
 *
 * @param props - Component props (see {@link BillingStatusBadgeProps}).
 * @returns The rendered status badge, or nothing while it has no status.
 */
export const BillingStatusBadge: Component<BillingStatusBadgeProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const status = useBillingStatus()
  const cancelState = useCancelSubscription()

  /**
   * Cancels the subscription and reports a confirmed cancellation.
   */
  const handleCancel = async (): Promise<void> => {
    const result = await cancelState.cancel()
    if (result?.canceled) props.onCanceled?.()
  }

  return (
    <Show
      when={!status.loading()}
      fallback={
        <span class={props.className} data-mol-id="billing-status-loading">
          {t('billing.status.loading', undefined, { defaultValue: 'Loading…' })}
        </span>
      }
    >
      <Show when={!status.error() && status.data()}>
        {(current) => (
          <div class={props.className} data-mol-id="billing-status">
            <span class={cm.cardDescription}>
              {t(
                'billing.status.currentPlan',
                { tierName: current().name },
                { defaultValue: 'Current plan: {{tierName}}' },
              )}
            </span>
            <Show when={(props.showCancel ?? true) && !current().isFree}>
              <button
                type="button"
                class={cm.button({ variant: 'outline', size: 'sm' })}
                disabled={cancelState.loading()}
                onClick={handleCancel}
                data-mol-id="billing-cancel-button"
              >
                {t('billing.status.cancelCta', undefined, { defaultValue: 'Cancel subscription' })}
              </button>
            </Show>
            <Show when={cancelState.error()}>
              <p class={cm.formError} role="alert">
                {t('billing.status.cancelError', undefined, {
                  defaultValue: 'Could not cancel. Please try again.',
                })}
              </p>
            </Show>
          </div>
        )}
      </Show>
    </Show>
  )
}

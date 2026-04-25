import { useTranslation } from '@molecule/app-react'
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
 * @param props - Component props.
 * @returns The rendered status badge.
 */
export function BillingStatusBadge(props: BillingStatusBadgeProps): React.ReactElement | null {
  const { onCanceled, className, showCancel = true } = props
  const cm = getClassMap()
  const { t } = useTranslation()
  const { data: status, loading, error } = useBillingStatus()
  const { cancel, loading: canceling, error: cancelError } = useCancelSubscription()

  if (loading) {
    return (
      <span className={className} data-mol-id="billing-status-loading">
        {t('billing.status.loading', undefined, { defaultValue: 'Loading…' })}
      </span>
    )
  }

  if (error || !status) {
    return null
  }

  const isFree = status.isFree

  const handleCancel = async (): Promise<void> => {
    const result = await cancel()
    if (result?.canceled) onCanceled?.()
  }

  return (
    <div className={className} data-mol-id="billing-status">
      <span className={cm.cardDescription}>
        {t(
          'billing.status.currentPlan',
          { tierName: status.name },
          { defaultValue: 'Current plan: {{tierName}}' },
        )}
      </span>
      {showCancel && !isFree && (
        <button
          type="button"
          className={cm.button({ variant: 'outline', size: 'sm' })}
          disabled={canceling}
          onClick={handleCancel}
          data-mol-id="billing-cancel-button"
        >
          {t('billing.status.cancelCta', undefined, { defaultValue: 'Cancel subscription' })}
        </button>
      )}
      {cancelError && (
        <p className={cm.formError} role="alert">
          {t('billing.status.cancelError', undefined, {
            defaultValue: 'Could not cancel. Please try again.',
          })}
        </p>
      )}
    </div>
  )
}

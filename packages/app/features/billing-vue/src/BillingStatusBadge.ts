/**
 * Vue billing-status badge: the current tier and its cancel action.
 *
 * Vue counterpart of `@molecule/app-billing-react`'s `BillingStatusBadge` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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
export const BillingStatusBadge = defineComponent({
  name: 'BillingStatusBadge',
  props: {
    onCanceled: {
      type: Function as PropType<BillingStatusBadgeProps['onCanceled']>,
      required: false,
    },
    className: String,
    showCancel: {
      type: Boolean,
      default: true,
    },
  },
  setup(props: BillingStatusBadgeProps) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const { data: status, loading, error } = useBillingStatus()
    const { cancel, loading: canceling, error: cancelError } = useCancelSubscription()

    /**
     * Cancels the subscription and reports a confirmed cancellation.
     */
    const handleCancel = async (): Promise<void> => {
      const result = await cancel()
      if (result?.canceled) props.onCanceled?.()
    }

    return (): VNodeChild => {
      if (loading.value) {
        return h(
          'span',
          { class: props.className, 'data-mol-id': 'billing-status-loading' },
          t('billing.status.loading', undefined, { defaultValue: 'Loading…' }),
        )
      }

      if (error.value || !status.value) {
        return null
      }

      const isFree = status.value.isFree

      return h('div', { class: props.className, 'data-mol-id': 'billing-status' }, [
        h(
          'span',
          { class: cm.cardDescription },
          t(
            'billing.status.currentPlan',
            { tierName: status.value.name },
            { defaultValue: 'Current plan: {{tierName}}' },
          ),
        ),
        props.showCancel && !isFree
          ? h(
              'button',
              {
                type: 'button',
                class: cm.button({ variant: 'outline', size: 'sm' }),
                disabled: canceling.value,
                onClick: handleCancel,
                'data-mol-id': 'billing-cancel-button',
              },
              t('billing.status.cancelCta', undefined, { defaultValue: 'Cancel subscription' }),
            )
          : null,
        cancelError.value
          ? h(
              'p',
              { class: cm.formError, role: 'alert' },
              t('billing.status.cancelError', undefined, {
                defaultValue: 'Could not cancel. Please try again.',
              }),
            )
          : null,
      ])
    }
  },
})

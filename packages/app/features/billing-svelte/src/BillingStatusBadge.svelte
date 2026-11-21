<!--
  BillingStatusBadge: the Svelte counterpart of `@molecule/app-billing-react`'s
  `BillingStatusBadge` — the current tier name and a cancel-subscription
  button on paid tiers. Same props (React names), same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useBillingStatus, useCancelSubscription } from './hooks.js'
  import type { BillingStatusBadgeProps } from './types.js'

  let { onCanceled, className, showCancel = true }: BillingStatusBadgeProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const { data: status, loading, error } = useBillingStatus()
  const { cancel, loading: cancelLoading, error: cancelError } = useCancelSubscription()

  /** Cancels the subscription and reports a confirmed cancellation. */
  const handleCancel = async (): Promise<void> => {
    const result = await cancel()
    if (result?.canceled) onCanceled?.()
  }
</script>

{#if $loading}
  <span class={className} data-mol-id="billing-status-loading">
    {t('billing.status.loading', undefined, { defaultValue: 'Loading…' })}
  </span>
{:else if $status && !$error}
  {@const current = $status}
  <div class={className} data-mol-id="billing-status">
    <span class={cm.cardDescription}>
      {t(
        'billing.status.currentPlan',
        { tierName: current.name },
        { defaultValue: 'Current plan: {{tierName}}' },
      )}
    </span>{#if showCancel && !current.isFree}
      <button
        type="button"
        class={cm.button({ variant: 'outline', size: 'sm' })}
        disabled={$cancelLoading}
        onclick={handleCancel}
        data-mol-id="billing-cancel-button"
      >
        {t('billing.status.cancelCta', undefined, { defaultValue: 'Cancel subscription' })}
      </button>
    {/if}{#if $cancelError}
      <p class={cm.formError} role="alert">
        {t('billing.status.cancelError', undefined, {
          defaultValue: 'Could not cancel. Please try again.',
        })}
      </p>
    {/if}
  </div>
{/if}

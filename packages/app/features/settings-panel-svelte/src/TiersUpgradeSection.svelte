<!--
  TiersUpgradeSection: billing section with full multi-tier upgrade flow.

  Replaces the simpler `BillingSection` for apps backed by
  `@molecule/api-payments-stripe` + `@molecule/api-resource-payment` — loads
  the user's current plan from `/api/billing/status`, loads available tiers
  from `/api/billing/tiers`, and renders an Upgrade modal with a Subscribe
  button per tier price. Subscribe POSTs to `/api/billing/checkout` and
  redirects to the Stripe checkout URL; paid users see a Cancel button that
  POSTs to `/api/billing/cancel`. A refused request shows the server's
  message.
-->
<script lang="ts">
  import { serverErrorMessage } from '@molecule/app-http'
  import { useHttpClient, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Alert, Button, ConfirmButton, Flex, Modal } from '@molecule/app-ui-svelte'
  import { openUrl } from '@molecule/app-utilities'

  import type { Tier, TiersUpgradeSectionProps } from './types.js'

  let { redirectToCheckout = openUrl }: TiersUpgradeSectionProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const http = useHttpClient()

  let plan = $state<string>('Free')
  let planKey = $state<string>('free')
  let tiers = $state<Tier[]>([])
  let showUpgrade = $state(false)
  let upgradeLoading = $state<string | null>(null)
  let upgradeError = $state('')

  $effect(() => {
    let cancelled = false
    void Promise.all([
      // Each fetch resolves null on failure; the .then handler then keeps the
      // defaults ('Free', empty tier list) instead of throwing.
      http.get<{ planKey?: string; name?: string }>('/api/billing/status').catch((_error) => null),
      http
        .get<{
          data?: Array<{
            key: string
            name: string
            prices: Array<{ stripePriceId: string | null; period: string; price: string }>
          }>
        }>('/api/billing/tiers')
        .catch((_error) => null),
    ])
      .then(([statusRes, tiersRes]) => {
        if (cancelled) return
        const status = statusRes?.data ?? null
        if (status?.name) plan = status.name
        if (status?.planKey) planKey = status.planKey
        const list = tiersRes?.data?.data ?? []
        if (Array.isArray(list)) {
          tiers = list.map((tier) => ({
            planKey: tier.key,
            name: tier.name,
            prices: (tier.prices || []).map((p) => ({
              stripePriceId: p.stripePriceId ?? undefined,
              interval: p.period,
              priceLabel: p.price,
            })),
          }))
        }
      })
      .catch((_error) => {
        // Fetch failures already resolve to null above; this only guards the
        // mapping, keeping the section on its defaults rather than throwing.
      })
    return () => {
      cancelled = true
    }
  })

  const handleStartCheckout = async (stripePriceId: string): Promise<void> => {
    upgradeError = ''
    upgradeLoading = stripePriceId
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/checkout',
        { priceId: stripePriceId },
      )
      const data = res.data
      if (data?.checkoutUrl) {
        redirectToCheckout(data.checkoutUrl)
        return
      }
      if (data?.updated) {
        showUpgrade = false
        return
      }
      upgradeError = t('settings.billing.checkoutFailed', undefined, {
        defaultValue: 'Could not start checkout.',
      })
    } catch (err) {
      upgradeError =
        serverErrorMessage(err) ??
        t('settings.billing.checkoutFailed', undefined, {
          defaultValue: 'Could not start checkout.',
        })
    } finally {
      upgradeLoading = null
    }
  }

  const handleCancelSubscription = async (): Promise<void> => {
    upgradeError = ''
    try {
      await http.post('/api/billing/cancel', {})
      plan = 'Free'
      planKey = 'free'
    } catch (err) {
      upgradeError =
        serverErrorMessage(err) ??
        t('settings.billing.cancelFailed', undefined, {
          defaultValue: 'Could not cancel.',
        })
    }
  }
</script>

<section>
  <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
    {t('settings.billing', undefined, { defaultValue: 'Billing' })}
  </h3>
  <Flex align="center" justify="between">
    <span class={cm.textSize('sm')}
      >{t('settings.plan', undefined, { defaultValue: 'Plan: ' })}<strong>{plan}</strong></span
    >
    {#if planKey === 'free'}
      <Button variant="outline" size="sm" onClick={() => (showUpgrade = true)}>
        {t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })}
      </Button>
    {:else}
      <ConfirmButton
        variant="outline"
        size="sm"
        label={t('settings.billing.cancel', undefined, { defaultValue: 'Cancel' })}
        confirmLabel={t('settings.billing.cancelConfirm', undefined, {
          defaultValue: 'Cancel your subscription?',
        })}
        onConfirm={handleCancelSubscription}
        data-mol-id="billing-cancel-subscription"
      />
    {/if}
  </Flex>
</section>

<Modal
  open={showUpgrade}
  onClose={() => (showUpgrade = false)}
  title={t('settings.billing.upgradeTitle', undefined, {
    defaultValue: 'Upgrade your plan',
  })}
>
  {#if upgradeError}
    <Alert status="error" className={cm.sp('mb', 4)}>
      {upgradeError}
    </Alert>
  {/if}
  {#if tiers.length === 0}
    <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
      {t('settings.billing.noTiers', undefined, {
        defaultValue: 'No paid plans configured.',
      })}
    </p>
  {:else}
    <ul class={cm.stack(3)}>
      {#each tiers
        .filter((tier) => tier.planKey !== 'free')
        .flatMap((tier) => tier.prices
            .filter((p) => p.stripePriceId)
            .map( (price) => ({ tier, price }) )) as entry (entry.tier.planKey + '-' + entry.price.stripePriceId)}
        <li class={cm.sp('p', 4)}>
          <Flex align="center" justify="between">
            <div>
              <p class={cm.fontWeight('semibold')}>
                {entry.tier.name} ({entry.price.interval})
              </p>
              <p class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{entry.price.priceLabel}</p>
            </div>
            <Button
              size="sm"
              loading={upgradeLoading === entry.price.stripePriceId}
              onClick={() =>
                entry.price.stripePriceId && handleStartCheckout(entry.price.stripePriceId)}
            >
              {t('settings.billing.subscribe', undefined, {
                defaultValue: 'Subscribe',
              })}
            </Button>
          </Flex>
        </li>
      {/each}
    </ul>
  {/if}
</Modal>

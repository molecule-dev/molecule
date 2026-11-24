<!--
  TiersUpgradeSection: billing section with full multi-tier upgrade flow.

  Replaces the simpler `BillingSection` for apps backed by
  `@molecule/api-payments-stripe` + `@molecule/api-resource-payment` — loads
  the user's current plan from `/api/billing/status`, loads available tiers
  from `/api/billing/tiers`, and renders an Upgrade modal with a Subscribe
  button per price that is for sale (one the server lists with a price id).
  Upgrade appears only for a free user and only when something is for sale.
  Subscribe POSTs to `/api/billing/checkout` and redirects to the checkout
  URL; a paid user (`isFree: false` in the status) sees a Cancel button that
  POSTs to `/api/billing/cancel`. A refused request shows the server's
  message.
-->
<script lang="ts">
  import { serverErrorMessage } from '@molecule/app-http'
  import { useHttpClient, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Alert, Button, ConfirmButton, Flex, Modal } from '@molecule/app-ui-svelte'
  import { openUrl } from '@molecule/app-utilities'

  import type { Tier, TierPrice, TiersUpgradeSectionProps } from './types.js'

  let { redirectToCheckout = openUrl }: TiersUpgradeSectionProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const http = useHttpClient()

  let plan = $state<string | null>(null)
  let planKey = $state<string | null>(null)
  let isFree = $state(true)
  let tiers = $state<Tier[]>([])
  // Bumped after a cancel so the effect reloads the plan the server now reports.
  let statusVersion = $state(0)
  let showUpgrade = $state(false)
  let upgradeLoading = $state<string | null>(null)
  let upgradeError = $state('')
  let cancelError = $state('')

  $effect(() => {
    // Read so a bump re-runs the load (the cleanup drops the earlier one).
    void statusVersion
    let cancelled = false
    void Promise.all([
      // Each fetch resolves null on failure; the .then handler then keeps the
      // defaults (no plan label, nothing for sale) instead of throwing.
      http
        .get<{ planKey?: string; name?: string; isFree?: boolean }>('/api/billing/status')
        .catch((_error) => null),
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
        if (typeof status?.isFree === 'boolean') isFree = status.isFree
        const list = tiersRes?.data?.data
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

  // What can be bought: a price the server lists with a price id, on a tier the user is not on.
  const forSale = $derived(
    tiers
      .filter((tier) => tier.planKey !== planKey)
      .flatMap((tier): Array<{ tier: Tier; price: TierPrice; priceId: string }> =>
        tier.prices.flatMap((price) =>
          price.stripePriceId ? [{ tier, price, priceId: price.stripePriceId }] : [],
        ),
      ),
  )

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
    cancelError = ''
    try {
      await http.post('/api/billing/cancel', {})
      // The server decides what the plan is now (a provider may cancel at period end).
      statusVersion += 1
    } catch (err) {
      cancelError =
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
    <!-- The plan line waits for the server: there is no plan name to guess. -->
    {#if plan}
      <span class={cm.textSize('sm')}
        >{t('settings.plan', undefined, { defaultValue: 'Plan: ' })}<strong>{plan}</strong></span
      >
    {:else}
      <span></span>
    {/if}
    {#if isFree}
      {#if forSale.length > 0}
        <Button variant="outline" size="sm" onClick={() => (showUpgrade = true)}>
          {t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })}
        </Button>
      {/if}
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
  {#if cancelError}
    <Alert status="error" className={cm.sp('mt', 3)}>
      {cancelError}
    </Alert>
  {/if}
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
  <ul class={cm.stack(3)}>
    {#each forSale as entry (entry.tier.planKey + '-' + entry.priceId)}
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
            loading={upgradeLoading === entry.priceId}
            onClick={() => handleStartCheckout(entry.priceId)}
          >
            {t('settings.billing.subscribe', undefined, {
              defaultValue: 'Subscribe',
            })}
          </Button>
        </Flex>
      </li>
    {/each}
  </ul>
</Modal>

<!--
  BillingSection: current plan + Upgrade button.

  Fetches `/api/billing/status` on mount and uses the returned plan name as a
  more accurate label than the parent-supplied default. The `plan` prop
  remains a fallback (e.g. for offline rendering or apps that don't expose
  `/billing/status`).

  The Upgrade button opens `upgradeTo`, the app's page for choosing a plan
  (`/pricing`, `/billing`). It has no default: no one route is right for
  every app, and the settings page this section sits in has no plans to
  choose. An app with no such page renders `TiersUpgradeSection`, which lists
  the tiers and starts the checkout itself. A section given no `upgradeTo`
  anyway (from JavaScript, or a template the compiler does not check) shows the
  plan without the button.
-->
<script lang="ts">
  import { useHttpClient, useRouter, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex } from '@molecule/app-ui-svelte'

  let { plan, upgradeTo }: { plan?: string; upgradeTo: string } = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const http = useHttpClient()

  let livePlan = $state<string | null>(null)

  // Refresh the current plan from the bonded entitlements/billing status
  // endpoint on mount. Fire-and-forget; the prop-supplied `plan` is the
  // fallback if the fetch fails.
  $effect(() => {
    let cancelled = false
    http
      .get<{ name?: string }>('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: { name?: string } }).data ?? (res as { name?: string })
        const name = body?.name
        if (typeof name === 'string' && name) livePlan = name
      })
      .catch((_error) => {
        /* fallback to the prop-supplied plan label */
      })
    return () => {
      cancelled = true
    }
  })
</script>

<section>
  <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
    {t('settings.billing', undefined, { defaultValue: 'Billing' })}
  </h3>
  <Flex align="center" justify="between">
    <span class={cm.textSize('sm')}
      >{t('settings.plan', undefined, { defaultValue: 'Plan: ' })}<strong
        >{livePlan ??
          plan ??
          t('settings.billing.freePlan', undefined, { defaultValue: 'Free' })}</strong
      ></span
    >
    {#if upgradeTo}
      <Button variant="outline" size="sm" onClick={() => navigate(upgradeTo)}>
        {t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })}
      </Button>
    {/if}
  </Flex>
</section>

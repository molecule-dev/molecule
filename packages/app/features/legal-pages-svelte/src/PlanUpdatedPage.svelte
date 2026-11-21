<!--
  PlanUpdatedPage: the Svelte counterpart of
  `@molecule/app-legal-pages-react`'s `PlanUpdatedPage` — the post-checkout
  confirmation screen. Waits for auth state to initialize, confirms the
  purchase from this origin, and shows a two-line confirmation with a single
  return-home action. Same props, same DOM for the same input.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { Link, useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, Spinner } from '@molecule/app-ui-svelte'

  import type { PlanUpdatedPageProps } from './types.js'

  let {
    messageKey = 'planUpdated.message',
    messageDefault = 'Your plan has been updated.',
    thankYouKey = 'planUpdated.thankYou',
    thankYouDefault = 'Thank you!',
    actionKey = 'planUpdated.returnHome',
    actionDefault = 'Return to Home',
    actionHref = '/',
    provider,
    verify = true,
  }: PlanUpdatedPageProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const { state: authState } = useAuth()
  // `useVerifyPaymentReturn` takes plain options and reads them once per mount
  // (its own contract), so the two props are read once deliberately.
  const verification = useVerifyPaymentReturn({
    provider: untrack(() => provider),
    enabled: untrack(() => verify),
  })
  const { status } = verification

  const waiting = $derived(!$authState.initialized || $status === 'verifying')
  const failed = $derived($status === 'failed')

  const message = $derived(t(messageKey, {}, { defaultValue: messageDefault }))
  const thanks = $derived(t(thankYouKey, {}, { defaultValue: thankYouDefault }))
  const action = $derived(t(actionKey, {}, { defaultValue: actionDefault }))
</script>

{#if waiting}
  <Flex align="center" justify="center" className={cm.sp('py', 12)}>
    <Spinner />
  </Flex>
{:else if failed}
  <main data-mol-id="page-plan-updated" class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
    <h2
      class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}
      data-mol-id="plan-updated-error"
    >
      {t('planUpdated.verifyFailed', undefined, {
        defaultValue: 'We could not confirm your payment yet.',
      })}
    </h2>
    <Button onClick={verification.retry} data-mol-id="plan-updated-retry">
      {t('planUpdated.retry', undefined, { defaultValue: 'Try again' })}
    </Button>
  </main>
{:else}
  <main data-mol-id="page-plan-updated" class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
    <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>{message}</h2>
    <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>{thanks}</h2>
    <Link to={actionHref}>
      <Button>{action}</Button>
    </Link>
  </main>
{/if}

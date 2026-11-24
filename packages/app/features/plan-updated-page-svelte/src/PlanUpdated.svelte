<!--
  PlanUpdated: the Svelte counterpart of `@molecule/app-plan-updated-page-react`'s
  `PlanUpdated` — post-purchase confirmation page shown after a plan upgrade.
  Same props, same DOM for the same input. Reads auth state to show a spinner
  while the session is still hydrating and while the purchase is being
  confirmed from this origin, then a two-line thank-you with a Return Home
  button and a View receipt link.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { Link, useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-svelte'

  import type { PlanUpdatedProps } from './types.js'

  let {
    messageKey = 'planUpdated.message',
    messageDefault = 'Your plan has been updated.',
    thankYouKey = 'planUpdated.thankYou',
    thankYouDefault = 'Thank you!',
    actionKey = 'planUpdated.returnHome',
    actionDefault = 'Return home',
    actionHref = '/',
    receiptHref = '/billing',
    provider,
    verify = true,
  }: PlanUpdatedProps = $props()

  const cm = getClassMap()
  const { t } = useTranslation()
  const { state: authState } = useAuth()
  // The provider redirects here with the purchase id in the query; confirming
  // it server-side from THIS origin is what grants the plan (see remarks).
  // `useVerifyPaymentReturn` takes plain options and reads them once per mount
  // (its own contract), so the two props are read once deliberately.
  const verification = useVerifyPaymentReturn({
    provider: untrack(() => provider),
    enabled: untrack(() => verify),
  })
  const { status } = verification

  const waiting = $derived(!$authState.initialized || $status === 'verifying')
  const failed = $derived($status === 'failed')
</script>

{#if waiting}
  <Flex align="center" justify="center" className={cm.sp('py', 12)}>
    <Spinner />
  </Flex>
{:else if failed}
  <section
    class={cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('px', 6), cm.sp('py', 16))}
    data-mol-id="plan-updated-page"
  >
    <h2
      class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
      data-mol-id="plan-updated-error"
    >
      {t('planUpdated.verifyFailed', undefined, {
        defaultValue: 'We could not confirm your payment yet.',
      })}
    </h2>
    <Button variant="solid" size="lg" onClick={verification.retry} data-mol-id="plan-updated-retry">
      {t('planUpdated.retry', undefined, { defaultValue: 'Try again' })}
    </Button>
  </section>
{:else}
  <section
    class={cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('px', 6), cm.sp('py', 16))}
    data-mol-id="plan-updated-page"
  >
    <div
      class={cm.cn(
        cm.mxAuto,
        cm.sp('mb', 8),
        cm.roundedFull,
        cm.bgPrimarySubtle,
        cm.textPrimary,
        cm.flex({ align: 'center', justify: 'center' }),
      )}
      style="width: 7rem; height: 7rem"
    >
      <Icon name="check-circle" size={64} aria-hidden="true" data-mol-id="plan-updated-icon" />
    </div>
    <!-- Both message + thankYou stay as <h2> for backward compatibility with
        per-app plan-updated.spec.ts assertions that two level-2 headings are
        present. Visual hierarchy comes from the font scale, not the heading
        level. -->
    <h2
      class={cm.cn(cm.textSize('4xl'), cm.italic, cm.fontWeight('bold'), cm.sp('mb', 4))}
      style="font-family: var(--font-headline, inherit)"
      data-mol-id="plan-updated-heading"
    >
      {t(messageKey, {}, { defaultValue: messageDefault })}
    </h2>
    <h2
      class={cm.cn(cm.textSize('lg'), cm.fontWeight('normal'), cm.textMuted, cm.sp('mb', 10))}
      data-mol-id="plan-updated-subheading"
    >
      {t(thankYouKey, {}, { defaultValue: thankYouDefault })}
    </h2>
    <Link to={actionHref}>
      <Button
        variant="solid"
        size="lg"
        className={cm.cn(cm.gradientPrimary, cm.uppercase, cm.trackingWide)}
        data-mol-id="plan-updated-return-home"
      >
        {t(actionKey, {}, { defaultValue: actionDefault })}
      </Button>
    </Link>
    {#if receiptHref !== null}
      <div class={cm.sp('mt', 6)}>
        <Link
          to={receiptHref}
          class={cm.cn(
            cm.textSize('xs'),
            cm.textSubtle,
            cm.uppercase,
            cm.trackingWide,
            cm.fontWeight('semibold'),
            cm.link,
          )}
          data-mol-id="plan-updated-view-receipt"
        >
          {t('planUpdated.viewReceipt', undefined, { defaultValue: 'View receipt' })}
        </Link>
      </div>
    {/if}
  </section>
{/if}

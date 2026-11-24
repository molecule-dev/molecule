<!--
  LoadErrorBanner: the shared "load failed" banner with an owned
  pending-state Retry button. A rejected retry keeps the banner (the caller
  owns the error); without onRetry no retry button renders.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { contentPresence, renderedContentCount } from '../content-presence.js'
  import { spreadEvents } from '../dom.js'
  import type { LoadErrorBannerProps } from '../types.js'
  import Alert from './Alert.svelte'
  import Button from './Button.svelte'
  import ReactNode from './ReactNode.svelte'

  let {
    message,
    detail,
    onRetry,
    retryLabel,
    retryMolId = 'load-error-retry',
    children,
    ...rest
  }: LoadErrorBannerProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  let pending = $state(false)
  // A retry label that renders nothing (React's `retryLabel ?? default`)
  // falls back to "Retry", so the custom content is measured with the default
  // label counted as the component's own fallback.
  let customRetryLabel = $state(false)
  const reportRetryLabel = (renders: boolean): void => {
    customRetryLabel = renders
  }
  const retryLabelPresence = contentPresence(reportRetryLabel, {
    renders: (element) =>
      renderedContentCount(element.querySelector('button') ?? element) > (customRetryLabel ? 0 : 1),
  })

  const handleRetry = (): void => {
    if (!onRetry || pending) return
    pending = true
    // A rejected retry means "still failing": the caller owns that error and
    // keeps showing the banner, so ignoring it here only stops it becoming an
    // unhandled rejection.
    void Promise.resolve(onRetry())
      .catch((_error: unknown) => undefined)
      .finally(() => (pending = false))
  }
</script>

<div {...reactAttrs(withoutEvents(rest))} use:spreadEvents={rest}>
  <Alert status="error" live={false}>
    <div class={cm.stack(2)}>
      <p class={cm.textSize('sm')}><ReactNode node={message} /></p>
      {#if detail}<PresentWhileContent tag="p" class={cm.cn(cm.textSize('xs'), cm.textMuted)}
          ><ReactNode node={detail} /></PresentWhileContent
        >{/if}
      {@render children?.()}
      {#if onRetry}
        <div class={cm.flex({ justify: 'start' })} {@attach retryLabelPresence}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={pending}
            data-mol-id={retryMolId}
          >
            {#if pending}{t('loadError.retrying', {}, { defaultValue: 'Retrying…' })}{:else}
              {#if retryLabel}<ReactNode node={retryLabel} />{/if}
              {#if !customRetryLabel}{t('loadError.retry', {}, { defaultValue: 'Retry' })}{/if}
            {/if}
          </Button>
        </div>
      {/if}
    </div>
  </Alert>
</div>

<!--
  IntegrationCard: the Svelte counterpart of
  `@molecule/app-integration-card-react`'s `IntegrationCard` — icon + title +
  description + status label + action button (or link). Same props, same DOM
  for the same input; node-valued props are snippets (or plain strings) and
  every visible status label goes through `t()` so a locale switch re-renders
  it.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Card } from '@molecule/app-ui-svelte'

  import type { IntegrationCardProps, IntegrationStatus } from './types.js'

  let {
    icon,
    title,
    description,
    status = 'disconnected',
    action,
    variant = 'card',
    className,
    dataMolId,
  }: IntegrationCardProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /**
   * The status label for one connection state, through `t()` under React's
   * `integrationCard.status.*` keys.
   *
   * @param value - The connection status.
   * @returns The translated label.
   */
  function statusText(value: IntegrationStatus): string {
    return value === 'connected'
      ? t('integrationCard.status.connected', {}, { defaultValue: 'Connected' })
      : value === 'pending'
        ? t('integrationCard.status.pending', {}, { defaultValue: 'Connecting…' })
        : value === 'error'
          ? t('integrationCard.status.error', {}, { defaultValue: 'Error' })
          : t('integrationCard.status.disconnected', {}, { defaultValue: 'Not connected' })
  }

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so this re-runs on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const statusLabel = $derived(statusText(status))
</script>

<Card
  {className}
  data-mol-id={dataMolId}
  style={variant === 'cta'
    ? {
        backgroundImage:
          'linear-gradient(135deg, var(--color-primary, #4070e0), var(--color-primary-container, #6b8fe8))',
      }
    : undefined}
>
  <div class={cm.flex({ align: 'start', gap: 'md' })}>
    {#if icon}
      <PresentWhileContent class={cm.shrink0}>
        {#if typeof icon === 'function'}{@render icon?.()}{:else}{icon}{/if}
      </PresentWhileContent>
    {/if}
    <div class={cm.cn(cm.flex1, cm.stack(2))}>
      <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
        {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
      </h3>
      {#if description}
        <PresentWhileContent tag="p" class={cm.textSize('sm')}>
          {#if typeof description === 'function'}{@render description?.()}{:else}{description}{/if}
        </PresentWhileContent>
      {/if}
      <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{statusLabel}</span>
        {#if action}
          {#if action.href}
            <a href={action.href}>
              <Button disabled={Boolean(action.disabled)}>
                {#if typeof action.label === 'function'}{@render action.label?.()}{:else}{action.label}{/if}
              </Button>
            </a>
          {:else}
            <Button
              disabled={Boolean(action.disabled) || Boolean(action.loading)}
              onClick={(event: MouseEvent) => action?.onClick?.(event)}
            >
              {#if action.loading}…{:else if typeof action.label === 'function'}{@render action.label?.()}{:else}{action.label}{/if}
            </Button>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</Card>

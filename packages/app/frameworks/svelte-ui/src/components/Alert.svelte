<!--
  Alert: a status banner with icon, title, description and dismiss button.
  `live` (default true) announces assertively (role alert); false switches to
  the polite role for static page content.
-->
<script lang="ts">
  import type { IconName } from '@molecule/app-icons'
  import { getClassMap } from '@molecule/app-ui'

  import { useI18n } from '../framework.js'
  import { reactStyle } from '../style.js'
  import type { AlertProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'

  const statusVariantMap: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }
  const statusIconMap: Record<string, IconName> = {
    info: 'info-circle',
    success: 'check-circle',
    warning: 'exclamation-triangle',
    error: 'x-circle',
  }

  let {
    children,
    title,
    status = 'info',
    variant,
    live = true,
    dismissible,
    onDismiss,
    icon,
    dismissLabel,
    className,
    style,
    testId,
  }: AlertProps = $props()

  const { t } = useI18n()
  const cm = $derived(getClassMap())
  const alertVariant = $derived(statusVariantMap[status] || 'default')
  const iconName = $derived(statusIconMap[alertVariant])
  const alertClasses = $derived(
    cm.cn(
      cm.alert({ variant: alertVariant }),
      variant === 'left-accent' && cm.alertLeftAccent({ variant: alertVariant }),
      className,
    ),
  )
  const role = $derived(live ? 'alert' : 'status')
</script>

<div {role} class={alertClasses} use:reactStyle={style} data-testid={testId}>
  {#if icon || iconName}
    <span class={cm.alertIconWrapper}>
      {#if icon}{@render icon()}{:else if iconName}<IconGlyph
          name={iconName}
          className={cm.iconMd}
        />{/if}
    </span>
  {/if}
  <div class={cm.alertContent}>
    {#if title}<h5 class={cm.alertTitle}>{title}</h5>{/if}
    <div class={cm.alertDescription}>{@render children?.()}</div>
  </div>
  {#if dismissible}
    <button
      type="button"
      onclick={onDismiss}
      class={cm.alertDismiss}
      aria-label={dismissLabel ?? $t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })}
    >
      <IconGlyph name="x-mark" className={cm.iconSm} />
    </button>
  {/if}
</div>

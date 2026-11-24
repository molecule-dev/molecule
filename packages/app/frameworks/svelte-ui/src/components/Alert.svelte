<!--
  Alert: a status banner with icon, title, description and dismiss button.
  `live` (default true) announces assertively (role alert); false switches to
  the polite role for static page content.
-->
<script lang="ts">
  import type { IconName } from '@molecule/app-icons'
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { contentPresence, renderedContentCount } from '../content-presence.js'
  import { spreadEvents } from '../dom.js'
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
    ref = $bindable(null),
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
    ...rest
  }: AlertProps = $props()

  const { t } = useTranslation()
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
  // A custom icon that renders nothing (React's `slot(icon)`) leaves the
  // status icon in place, so the custom content is measured, with the status
  // icon counted as the component's own fallback.
  let customIcon = $state(false)
  const reportIcon = (renders: boolean): void => {
    customIcon = renders
  }
  const showStatusIcon = $derived(!!iconName && !customIcon)
  // The wrapper leaves the page with its content (PresentWhileContent), so the
  // custom content is measured on the alert itself, with the status icon
  // counted as the component's own fallback.
  const iconPresence = contentPresence(reportIcon, {
    renders: (element) => {
      const wrapper = element.querySelector(':scope > span')
      return wrapper ? renderedContentCount(wrapper) > (showStatusIcon ? 1 : 0) : false
    },
  })
  // Every other declared prop (id, aria-*, data-*, automationId as data-mol-id,
  // the DOM event handlers) reaches the root; a caller's role replaces the
  // live-region default.
  const attributes = $derived(reactAttrs(withoutEvents(rest)))
</script>

<div
  bind:this={ref}
  {role}
  class={alertClasses}
  use:reactStyle={style}
  data-testid={testId}
  {...attributes}
  use:spreadEvents={rest}
  {@attach iconPresence}
>
  {#if icon || iconName}
    <PresentWhileContent tag="span" class={cm.alertIconWrapper}>
      {#if icon}{@render icon?.()}{/if}
      {#if showStatusIcon && iconName}<IconGlyph name={iconName} className={cm.iconMd} />{/if}
    </PresentWhileContent>
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
      aria-label={dismissLabel ?? t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })}
    >
      <IconGlyph name="x-mark" className={cm.iconSm} />
    </button>
  {/if}
</div>

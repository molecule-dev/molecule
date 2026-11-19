<!--
  Spinner: a role="status" loading indicator. Data-* and aria-* props are
  forwarded to the div; an arbitrary color becomes border colors inline.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { SpinnerProps } from '../types.js'

  let {
    ref = $bindable(null),
    size = 'md',
    color,
    label,
    className,
    style,
    testId,
    ...rest
  }: SpinnerProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const classes = $derived(cm.cn(cm.spinner({ size }), className))
  const namedColors = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
  const colorStyle = $derived(
    color && typeof color === 'string' && !namedColors.includes(color)
      ? { borderColor: color, borderTopColor: 'transparent' }
      : undefined,
  )
  // React's rest spread: every declared prop (a caller's aria-label replaces
  // the default, automationId renders as data-mol-id, data-* reach the div).
  const attributes = $derived(reactAttrs(withoutEvents(rest)))
  const mergedStyle = $derived({ ...style, ...colorStyle })
</script>

<div
  bind:this={ref}
  role="status"
  aria-label={label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
  class={classes}
  use:reactStyle={mergedStyle}
  data-testid={testId}
  {...attributes}
  use:spreadEvents={rest}
>
  {#if label}<span class={cm.srOnly}>{label}</span>{/if}
</div>

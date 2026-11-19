<!--
  Badge: a small status label span.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { BadgeProps } from '../types.js'

  let {
    ref = $bindable(null),
    children,
    color = 'primary',
    variant: _variant = 'solid',
    size,
    rounded = true,
    className,
    style,
    testId,
    ...rest
  }: BadgeProps = $props()

  const cm = $derived(getClassMap())
  const badgeClasses = $derived(
    cm.cn(cm.badge({ variant: color, size }), !rounded && cm.badgeSquare, className),
  )
  // Every other declared prop (id, title, aria-*, data-*, automationId as
  // data-mol-id, the DOM event handlers) reaches the span.
  const attributes = $derived(reactAttrs(withoutEvents(rest)))
</script>

<span
  bind:this={ref}
  class={badgeClasses}
  use:reactStyle={style}
  data-testid={testId}
  {...attributes}
  use:spreadEvents={rest}>{@render children?.()}</span
>

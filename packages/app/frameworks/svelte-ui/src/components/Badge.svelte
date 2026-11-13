<!--
  Badge: a small status label span.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { BadgeProps } from '../types.js'

  let {
    children,
    color = 'primary',
    variant: _variant = 'solid',
    size,
    rounded = true,
    className,
    style,
    testId,
  }: BadgeProps = $props()

  const cm = $derived(getClassMap())
  const badgeClasses = $derived(
    cm.cn(cm.badge({ variant: color, size }), !rounded && cm.badgeSquare, className),
  )
</script>

<span class={badgeClasses} use:reactStyle={style} data-testid={testId}>{@render children?.()}</span>

<!--
  Separator: a visual divider; decorative by default (role none).
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { SeparatorProps } from '../types.js'

  let {
    ref = $bindable(null),
    orientation = 'horizontal',
    decorative = true,
    className,
    style,
    testId,
    automationId,
  }: SeparatorProps = $props()

  const cm = $derived(getClassMap())
  const separatorClasses = $derived(cm.cn(cm.separator({ orientation }), className))
</script>

<div
  bind:this={ref}
  role={decorative ? 'none' : 'separator'}
  aria-orientation={decorative ? undefined : orientation}
  class={separatorClasses}
  use:reactStyle={style}
  data-testid={testId}
  data-mol-id={automationId}
></div>

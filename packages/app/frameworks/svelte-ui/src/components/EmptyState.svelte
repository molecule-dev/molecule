<!--
  EmptyState: the centered no-content placeholder with optional icon, title,
  description and action.
-->
<script lang="ts">
  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { EmptyStateProps } from '../types.js'

  let {
    ref = $bindable(null),
    icon,
    title,
    description,
    action,
    className,
    style,
    testId,
    automationId,
  }: EmptyStateProps = $props()

  const cm = $derived(getClassMap())
</script>

<div
  bind:this={ref}
  class={cm.cn(cm.emptyState, className)}
  use:reactStyle={style}
  data-testid={testId}
  data-mol-id={automationId}
>
  {#if icon}<PresentWhileContent class={cm.emptyStateIcon}>{@render icon?.()}</PresentWhileContent
    >{/if}
  <h3 class={cm.emptyStateTitle}>{title}</h3>
  {#if description}<p class={cm.emptyStateDescription}>{description}</p>{/if}
  {#if action}<PresentWhileContent class={cm.emptyStateAction}
      >{@render action?.()}</PresentWhileContent
    >{/if}
</div>

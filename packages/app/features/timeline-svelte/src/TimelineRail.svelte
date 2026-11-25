<!--
  TimelineRail: the Svelte counterpart of `@molecule/app-timeline-react`'s
  `TimelineRail` — the left-hand rail of a timeline row: the marker (a default
  dot when none is given) and an optional vertical connector extending
  downward. Same props (React names), same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { type CSSStyle, reactStyle } from '@molecule/app-ui-svelte'

  import type { TimelineRailProps } from './types.js'

  let { marker, connector = true, className }: TimelineRailProps = $props()

  const cm = $derived(getClassMap())

  /** The connector's inline style, exactly React's object. */
  const connectorStyle: CSSStyle = {
    'border-left': '1px solid currentColor',
    opacity: '0.2',
    'min-height': '24px',
  }
</script>

<div class={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.shrink0, className)}>
  <div>
    {#if marker == null}
      <span aria-hidden="true">•</span>
    {:else if typeof marker === 'string' || typeof marker === 'number'}
      {marker}
    {:else}
      {@render marker?.()}
    {/if}
  </div>
  {#if connector}
    <div class={cm.cn(cm.w(0 as const), cm.h('full'))} use:reactStyle={connectorStyle}></div>
  {/if}
</div>

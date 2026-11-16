<!--
  ChartLegend: the Svelte counterpart of `@molecule/app-chart-wrapper-react`'s
  `ChartLegend` — swatch + label (+ optional value) per series. When `onToggle`
  is provided, items become buttons that toggle series visibility. Same props
  (React names), same ClassMap tokens, same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ChartLegendItem, ChartLegendProps } from './types.js'

  let { items, onToggle, layout = 'horizontal', className }: ChartLegendProps = $props()

  const cm = $derived(getClassMap())
  const rootClass = $derived(
    cm.cn(
      cm.flex({
        direction: layout === 'vertical' ? 'col' : 'row',
        align: 'center',
        gap: 'md',
        wrap: 'wrap',
      }),
      className,
    ),
  )
  const swatchStyle = (item: ChartLegendItem): string =>
    `display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: ${item.color}; opacity: ${item.hidden ? 0.3 : 1}`
</script>

{#snippet content(item: ChartLegendItem)}
  <span class={cm.flex({ align: 'center', gap: 'xs' })}>
    <span aria-hidden="true" style={swatchStyle(item)}></span>
    <span
      class={cm.cn(cm.textSize('sm'), item.hidden ? cm.textSize('sm') : undefined)}
      style={item.hidden ? 'opacity: 0.5' : undefined}
    >
      {#if typeof item.label === 'function'}{@render item.label()}{:else}{item.label}{/if}
    </span>
    {#if item.value !== undefined}
      <span class={cm.textSize('sm')}>
        {#if typeof item.value === 'function'}{@render item.value()}{:else}{item.value}{/if}
      </span>
    {/if}
  </span>
{/snippet}

<div class={rootClass}>
  {#each items as item (item.id)}
    {#if onToggle}
      <button type="button" onclick={() => onToggle?.(item.id)} aria-pressed={!item.hidden}>
        {@render content(item)}
      </button>
    {:else}
      <span>{@render content(item)}</span>
    {/if}
  {/each}
</div>

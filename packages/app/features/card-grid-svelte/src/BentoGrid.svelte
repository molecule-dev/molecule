<!--
  BentoGrid: the Svelte counterpart of `@molecule/app-card-grid-react`'s
  `BentoGrid` — items span multiple cells for a magazine / dashboard layout,
  with the same props (React names) and the same DOM for the same input.
  Works in two modes: (a) col/row-span driven, (b) named-areas driven via the
  `areas` prop.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { BentoGridProps, BentoItem } from './types.js'

  let { items, areas, columns = 12, gap = 'md', className }: BentoGridProps = $props()

  const cm = getClassMap()
  const classes = $derived(cm.cn(cm.grid({ gap }), className))
  const gridStyle = $derived(
    areas
      ? `display: grid; grid-template-areas: ${areas}`
      : `display: grid; grid-template-columns: repeat(${columns}, minmax(0, 1fr))`,
  )

  /**
   * The inline style of one item wrapper: React writes `{ gridArea: it.area }`
   * in areas mode (an absent area renders no declaration at all) and the col /
   * row spans otherwise.
   *
   * @param item - The item.
   * @returns The style string, or `undefined` for no style attribute.
   */
  function itemStyle(item: BentoItem): string | undefined {
    if (areas) return item.area !== undefined ? `grid-area: ${item.area}` : undefined
    return `grid-column: span ${item.colSpan ?? 4}; grid-row: span ${item.rowSpan ?? 1}`
  }
</script>

<div class={classes} style={gridStyle}>
  {#each items as item (item.id)}
    <div style={itemStyle(item)}>
      {#if typeof item.content === 'function'}{@render item.content()}{:else}{item.content ??
          ''}{/if}
    </div>
  {/each}
</div>

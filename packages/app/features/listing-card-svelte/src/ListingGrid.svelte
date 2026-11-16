<!--
  ListingGrid: the Svelte counterpart of
  `@molecule/app-listing-card-react`'s `ListingGrid` — a fixed `columns`-column
  grid at every viewport width. Same props (React names), same ClassMap
  tokens, same DOM.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ListingGridProps } from './types.js'

  let { children, columns = 3, gap = 'md', className }: ListingGridProps = $props()

  const cm = $derived(getClassMap())
  const classes = $derived(cm.cn(cm.grid({ cols: columns, gap }), className))
</script>

<div class={classes}>
  {@render children?.()}
</div>

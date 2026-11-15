<!--
  CardGrid: the Svelte counterpart of `@molecule/app-card-grid-react`'s
  `CardGrid` — the generic responsive card grid, with the same props (React
  names) and the same DOM for the same input. Collapses to one column on
  narrow viewports and grows to `columns` on md+ via the ClassMap grid.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { CardGridProps } from './types.js'

  let { children, columns = 3, gap = 'md', className }: CardGridProps = $props()

  const cm = getClassMap()
  const classes = $derived(cm.cn(cm.grid({ cols: columns, gap }), className))
</script>

<div class={classes}>
  {@render children?.()}
</div>

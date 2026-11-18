<!--
  KpiCardGrid: the Svelte counterpart of `@molecule/app-kpi-card-react`'s
  `KpiCardGrid` — the fixed-column grid the cards sit in. Same props (React
  names), same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { KpiCardGridProps } from './types.js'

  let { children, columns = 4, gap = 'md', className }: KpiCardGridProps = $props()

  const cm = $derived(getClassMap())
  const gridClass = $derived(cm.cn(cm.grid({ cols: columns, gap }), className))
</script>

<div class={gridClass}>
  {@render children?.()}
</div>

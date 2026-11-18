<!--
  FacetedSearchBar: the Svelte counterpart of
  `@molecule/app-faceted-search-react`'s `FacetedSearchBar` — fixed-position
  horizontal container for a row of faceted-search primitives. Same props, same
  DOM for the same input; children compose freely.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { FacetedSearchBarProps } from './types.js'

  let { children, topOffsetPx = 64, className }: FacetedSearchBarProps = $props()

  const cm = $derived(getClassMap())
</script>

<div
  data-mol-id="filter-bar"
  style="top: {topOffsetPx}px"
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'md' }),
    cm.sp('px', 6),
    cm.sp('py', 3),
    cm.surface,
    cm.w('full'),
    cm.facetedSearchBar,
    className,
  )}
>
  {@render children?.()}
</div>

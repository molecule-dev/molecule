<!--
  LimitsList: the Svelte counterpart of `@molecule/app-billing-react`'s
  `LimitsList` — the container of a tier's feature list, rendered as a stacked
  `<ul>`. Same DOM for the same input; the rows arrive as the default snippet.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  let { children }: { children?: Snippet } = $props()

  const cm = $derived(getClassMap())
</script>

<ul class={cm.stack(3)} data-mol-id="pricing-limits-list">
  {@render children?.()}
</ul>

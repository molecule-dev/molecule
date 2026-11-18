<!--
  TableFooter: the Svelte counterpart of `@molecule/app-data-table-ui-react`'s
  `TableFooter` — the bar below a table with a left summary and a right
  pagination slot. Same props (React names), same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ReactNodeProp } from './node-prop.js'
  import type { TableFooterProps } from './types.js'

  let { left, right, className }: TableFooterProps = $props()

  const cm = $derived(getClassMap())
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value()}{:else if value !== undefined && value !== ''}{value}{/if}
{/snippet}

<div
  class={cm.cn(
    cm.flex({ justify: 'between', align: 'center', gap: 'sm', wrap: 'wrap' }),
    cm.sp('pt', 3),
    className,
  )}
>
  <div>{@render node(left)}</div>
  <div>{@render node(right)}</div>
</div>

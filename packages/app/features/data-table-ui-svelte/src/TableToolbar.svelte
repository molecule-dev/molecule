<!--
  TableToolbar: the Svelte counterpart of `@molecule/app-data-table-ui-react`'s
  `TableToolbar` — the top-chrome row above a table with left/right slots and an
  optional filter sub-row. Same props (React names), same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ReactNodeProp } from './node-prop.js'
  import type { TableToolbarProps } from './types.js'

  let { left, right, below, className }: TableToolbarProps = $props()

  const cm = $derived(getClassMap())
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value?.()}{:else if value !== undefined && value !== ''}{value}{/if}
{/snippet}

<div class={cm.cn(cm.stack(2), className)}>
  <div class={cm.flex({ justify: 'between', align: 'center', gap: 'sm', wrap: 'wrap' })}>
    <div class={cm.flex({ align: 'center', gap: 'sm' })}>{@render node(left)}</div>
    <div class={cm.flex({ align: 'center', gap: 'sm' })}>{@render node(right)}</div>
  </div>
  {@render node(below)}
</div>

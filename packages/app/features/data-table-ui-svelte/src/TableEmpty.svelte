<!--
  TableEmpty: the Svelte counterpart of `@molecule/app-data-table-ui-react`'s
  `TableEmpty` — a single full-width row shown when a table has no data. Same
  props (React names), same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ReactNodeProp } from './node-prop.js'
  import type { TableEmptyProps } from './types.js'

  let { colSpan, children, className }: TableEmptyProps = $props()

  const cm = $derived(getClassMap())
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value?.()}{:else if value !== undefined && value !== ''}{value}{/if}
{/snippet}

<tr>
  <td colspan={colSpan} class={cm.cn(cm.sp('py', 10), cm.textCenter, className)}>
    {@render node(children)}
  </td>
</tr>

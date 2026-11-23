<!--
  RowWithActions: the Svelte counterpart of
  `@molecule/app-data-table-ui-react`'s `RowWithActions` — a `<tr>` wrapper that
  adds a trailing actions cell plus a click handler on the body, and stops a
  click inside the actions cell from reaching the row. Same props (React names),
  same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ReactNodeProp } from './node-prop.js'
  import type { RowWithActionsProps } from './types.js'

  let { children, actions, onClick, selected, className }: RowWithActionsProps = $props()

  const cm = $derived(getClassMap())
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value?.()}{:else if value !== undefined && value !== ''}{value}{/if}
{/snippet}

<tr
  onclick={(event) => onClick?.(event)}
  aria-selected={selected}
  class={cm.cn(onClick ? cm.cursorPointer : undefined, className)}
>
  {@render node(children)}
  {#if actions !== undefined}
    <td onclick={(event) => event.stopPropagation()} class={cm.cn(cm.textCenter)}>
      {@render node(actions)}
    </td>
  {/if}
</tr>

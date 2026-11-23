<!--
  DefinitionList: the Svelte counterpart of `@molecule/app-info-display-react`'s
  `DefinitionList` — a structured label/value pair list, stacked at `columns=1`
  and gridded at `columns` 2 or 3. Same props (React names), same DOM for the
  same input. Labels, values and icons are node-valued: a snippet renders,
  plain text prints.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { DefinitionListProps } from './types.js'

  let { fields, columns = 1, className }: DefinitionListProps = $props()

  const cm = $derived(getClassMap())
  const listClass = $derived(
    cm.cn(columns === 1 ? cm.stack(3) : cm.grid({ cols: columns, gap: 'md' }), className),
  )
  const itemClass = $derived(cm.stack(0 as const))
  const termClass = $derived(
    cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.flex({ align: 'center', gap: 'xs' })),
  )
  const valueClass = $derived(cm.textSize('sm'))
</script>

<dl class={listClass}>
  {#each fields as field, index (index)}
    <div class={itemClass}>
      <dt class={termClass}>
        {#if typeof field.icon === 'function'}{@render field.icon?.()}{:else if field.icon}{field.icon}{/if}<span
          >{#if typeof field.label === 'function'}{@render field.label?.()}{:else}{field.label}{/if}</span
        >
      </dt>
      <dd class={valueClass}>
        {#if typeof field.value === 'function'}{@render field.value?.()}{:else}{field.value}{/if}
      </dd>
    </div>
  {/each}
</dl>

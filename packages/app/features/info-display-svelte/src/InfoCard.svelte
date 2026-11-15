<!--
  InfoCard: the Svelte counterpart of `@molecule/app-info-display-react`'s
  `InfoCard` — a Card wrapping a DefinitionList under a title, with optional
  icon and header actions. Same props (React names), same DOM for the same
  input. `title`, `icon` and `actions` are node-valued: a snippet renders,
  plain text prints.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import DefinitionList from './DefinitionList.svelte'
  import type { InfoCardProps } from './types.js'

  let { title, icon, actions, fields, columns = 1, className, dataMolId }: InfoCardProps = $props()

  const cm = $derived(getClassMap())
  const stackClass = $derived(cm.stack(3))
  const headerClass = $derived(cm.flex({ justify: 'between', align: 'center', gap: 'sm' }))
  const innerClass = $derived(cm.flex({ align: 'center', gap: 'sm' }))
  const titleClass = $derived(cm.cn(cm.textSize('base'), cm.fontWeight('semibold')))
</script>

<Card {className} data-mol-id={dataMolId}>
  <div class={stackClass}>
    <header class={headerClass}>
      <div class={innerClass}>
        {#if typeof icon === 'function'}{@render icon()}{:else if icon}{icon}{/if}
        <h3 class={titleClass}>
          {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
        </h3>
      </div>
      {#if typeof actions === 'function'}{@render actions()}{:else if actions}{actions}{/if}
    </header>
    <DefinitionList {fields} {columns} />
  </div>
</Card>

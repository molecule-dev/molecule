<!--
  KanbanColumnHeader: the Svelte counterpart of
  `@molecule/app-kanban-board-react`'s `KanbanColumnHeader` — column heading
  row with title + count + right actions. Same props (React names), same DOM
  for the same input; the title is a snippet or plain text and the actions are
  a snippet.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { isSnippet, textOf } from './text.js'
  import type { KanbanColumnHeaderProps } from './types.js'

  let { title, count, actions, className }: KanbanColumnHeaderProps = $props()

  const cm = $derived(getClassMap())
</script>

<header
  class={cm.cn(
    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
    cm.sp('pb', 2),
    className,
  )}
>
  <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
      >{#if isSnippet(title)}{@render title()}{:else}{textOf(title)}{/if}</span
    >
    {#if typeof count === 'number'}
      <span class={cm.cn(cm.textSize('xs'))}>({count})</span>
    {/if}
  </div>
  {#if actions}{@render actions()}{/if}
</header>

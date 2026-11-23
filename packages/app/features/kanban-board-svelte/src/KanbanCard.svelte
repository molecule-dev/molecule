<!--
  KanbanCard: the Svelte counterpart of `@molecule/app-kanban-board-react`'s
  `KanbanCard` — a `Card` with the card's title, optional body and footer.
  Same props (React names), same DOM for the same input. Drag-drop is opt-in
  via `onDragStart`: with it the card gains the outer `draggable` div React
  renders; without it the `Card` itself is the root.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import { isSnippet, textOf } from './text.js'
  import type { KanbanCardProps } from './types.js'

  let { card, onClick, onDragStart, className }: KanbanCardProps = $props()

  const cm = $derived(getClassMap())
</script>

{#snippet inner()}
  <div class={cm.cn(cm.stack(2))}>
    <h4 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if isSnippet(card.title)}{@render card.title?.()}{:else}{textOf(card.title)}{/if}
    </h4>
    {#if card.body}
      <div class={cm.cn(cm.textSize('sm'))}>
        {#if isSnippet(card.body)}{@render card.body?.()}{:else}{textOf(card.body)}{/if}
      </div>
    {/if}
    {#if card.footer}
      <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        {#if isSnippet(card.footer)}{@render card.footer?.()}{:else}{textOf(card.footer)}{/if}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet cardBody()}
  <Card
    className={cm.cn(cm.cursorPointer, className)}
    onClick={onClick ? () => onClick(card) : undefined}
  >
    {@render inner()}
  </Card>
{/snippet}

{#if onDragStart}
  <!-- React's reference wrapper is a plain `draggable` div with no role;
       adding one would change the DOM every framework must match. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div draggable={true} ondragstart={(event) => onDragStart(card, event)}>
    {@render cardBody()}
  </div>
{:else}
  {@render cardBody()}
{/if}

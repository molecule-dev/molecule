<!--
  KanbanColumn: the Svelte counterpart of `@molecule/app-kanban-board-react`'s
  `KanbanColumn` — header + card list + optional footer. Same props (React
  names), same DOM for the same input. The drop handlers exist only when
  `onDrop` is supplied, exactly as React gates them.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import KanbanCard from './KanbanCard.svelte'
  import KanbanColumnHeader from './KanbanColumnHeader.svelte'
  import type { KanbanColumnProps } from './types.js'

  let {
    column,
    onCardClick,
    onDrop,
    onCardDragStart,
    headerActions,
    footer,
    className,
  }: KanbanColumnProps = $props()

  const cm = $derived(getClassMap())
</script>

<!-- React's reference column is a plain `<section>` carrying the drag handlers
     and no role; adding one would change the DOM every framework must match. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<section
  class={cm.cn(cm.stack(2), className)}
  ondragover={onDrop ? (event) => event.preventDefault() : undefined}
  ondrop={onDrop ? (event) => onDrop(column, event) : undefined}
>
  <KanbanColumnHeader title={column.title} count={column.cards.length} actions={headerActions} />
  <div class={cm.cn(cm.stack(2))}>
    {#each column.cards as card (card.id)}
      <KanbanCard
        {card}
        onClick={onCardClick ? (clicked) => onCardClick(clicked, column) : undefined}
        onDragStart={onCardDragStart
          ? (dragged, event) => onCardDragStart(dragged, column, event)
          : undefined}
      />
    {/each}
  </div>
  {#if footer}{@render footer?.()}{/if}
</section>

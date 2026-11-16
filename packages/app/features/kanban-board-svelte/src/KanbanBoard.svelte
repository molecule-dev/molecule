<!--
  KanbanBoard: the Svelte counterpart of `@molecule/app-kanban-board-react`'s
  `KanbanBoard` — columns side-by-side with HTML5 drag-drop between columns.
  Same props (React names), same ClassMap tokens, same DOM for the same input.
  Pure UI: consumers own the card data and persist moves in `onCardMove`.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import KanbanColumn from './KanbanColumn.svelte'
  import type { KanbanBoardProps, KanbanCardData, KanbanColumnData } from './types.js'

  let {
    columns,
    onCardMove,
    onCardClick,
    renderHeaderActions,
    renderFooter,
    className,
  }: KanbanBoardProps = $props()

  const cm = $derived(getClassMap())

  /**
   * Stores the card identity in the drag payload so the drop handler knows the
   * source column (the same JSON React writes).
   *
   * @param card - The dragged card.
   * @param column - The column it started from.
   * @param event - The drag start event.
   */
  function onCardDragStart(card: KanbanCardData, column: KanbanColumnData, event: DragEvent): void {
    event.dataTransfer?.setData(
      'text/molecule-kanban',
      JSON.stringify({ cardId: card.id, fromColumnId: column.id }),
    )
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  /**
   * Handles a card drop onto a column, parsing the drag payload and invoking
   * `onCardMove` when the card came from a different column.
   *
   * @param column - The column dropped on.
   * @param event - The drop event.
   */
  function handleDrop(column: KanbanColumnData, event: DragEvent): void {
    event.preventDefault()
    const payload = event.dataTransfer?.getData('text/molecule-kanban')
    if (!payload || !onCardMove) return
    try {
      const { cardId, fromColumnId } = JSON.parse(payload) as {
        cardId: string
        fromColumnId: string
      }
      if (fromColumnId !== column.id) onCardMove(cardId, fromColumnId, column.id)
    } catch (_error) {
      // Safe to ignore: the dataTransfer payload is untrusted/malformed, so the drop is cancelled.
    }
  }
</script>

<div class={cm.cn(cm.flex({ align: 'start', gap: 'md' }), className)}>
  {#each columns as column (column.id)}
    <div class={cm.cn(cm.flex1)}>
      <KanbanColumn
        {column}
        {onCardClick}
        onDrop={onCardMove ? handleDrop : undefined}
        {onCardDragStart}
      >
        {#snippet headerActions()}
          {#if renderHeaderActions}{@render renderHeaderActions(column)}{/if}
        {/snippet}
        {#snippet footer()}
          {#if renderFooter}{@render renderFooter(column)}{/if}
        {/snippet}
      </KanbanColumn>
    </div>
  {/each}
</div>

<!--
  ReorderableList: the Svelte counterpart of
  `@molecule/app-reorderable-list-react`'s `ReorderableList` — drag-handle
  reorder list with HTML5 DnD AND keyboard reordering. Same props (React
  names), same DOM for the same input; `renderItem` and `renderHandle` arrive
  as snippets, and every visible string goes through `t()`.

  Every row ships move-up/move-down buttons; Alt+ArrowUp / Alt+ArrowDown on a
  focused move button reorders its row, and focus follows the item: a move that
  disables the used button (the item reached the top or the bottom) moves focus
  to the same row's other button.
-->
<script lang="ts" generics="T">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ReorderableListProps } from './types.js'

  let { items, onReorder, renderItem, renderHandle, className }: ReorderableListProps<T> = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let draggingId = $state<string | null>(null)
  let overId = $state<string | null>(null)

  /** The list's id prefix; each row's position span is `${baseId}-position-${index}`. */
  const baseId: string = $props.id()

  /** The rows' move buttons, keyed by item id — the focus effect's targets. */
  const moveButtons = Object.create(null) as Record<
    string,
    { up: HTMLButtonElement | null; down: HTMLButtonElement | null } | undefined
  >

  /**
   * Captures one move button under its item id (a Svelte action, so the node
   * arrives at mount), for the focus effect to reach either button of a row.
   *
   * @param node - The move button.
   * @param ref - The row's item id and which button of the row this is.
   */
  function moveRef(node: HTMLButtonElement, ref: [id: string, button: 'up' | 'down']): void {
    const [id, button] = ref
    const row = moveButtons[id] ?? { up: null, down: null }
    row[button] = node
    moveButtons[id] = row
  }

  /** The move whose focus settles once `items` changes: the item id and the button used. */
  let focusRequest: { id: string; button: 'up' | 'down' } | null = null

  /**
   * Moves the item at `index` by `delta` positions and emits the new order.
   * No-ops at the list boundaries, exactly as React's `moveItem` does.
   *
   * @param index - Current position of the item to move.
   * @param delta - -1 to move up, 1 to move down.
   */
  function moveItem(index: number, delta: -1 | 1): void {
    const to = index + delta
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [moved] = next.splice(index, 1)
    next.splice(to, 0, moved!)
    onReorder(next)
  }

  /**
   * Keyboard reordering for a focused row: Alt+ArrowUp / Alt+ArrowDown move it.
   * Alt is required so plain arrows still scroll/move the caret and browser
   * history navigation is left untouched.
   *
   * @param index - Position of the focused row.
   * @param event - The keyboard event.
   */
  function onItemKeyDown(index: number, event: KeyboardEvent): void {
    if (!event.altKey) return
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveItem(index, -1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveItem(index, 1)
    }
  }

  /**
   * Moves the item with a move button, recording which button was used so the
   * focus effect can settle focus after the new order lands.
   *
   * @param id - The moved item's id.
   * @param index - Current position of the item to move.
   * @param delta - -1 to move up, 1 to move down.
   * @param button - The button the move came from.
   */
  function moveFromButton(id: string, index: number, delta: -1 | 1, button: 'up' | 'down'): void {
    focusRequest = { id, button }
    moveItem(index, delta)
  }

  /**
   * Keyboard reordering for a focused move button: Alt+ArrowUp / Alt+ArrowDown
   * move its item. A key that moves also records the button used, for the same
   * focus settling a click gets.
   *
   * @param id - The row's item id.
   * @param index - Current position of the row's item.
   * @param button - Which button of the row this is.
   * @param event - The keyboard event.
   */
  function onButtonKeyDown(
    id: string,
    index: number,
    button: 'up' | 'down',
    event: KeyboardEvent,
  ): void {
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      focusRequest = { id, button }
    }
    onItemKeyDown(index, event)
  }

  // Focus settles after a move: when the button that was used is disabled by
  // the new order (the item reached the top or the bottom), focus moves to
  // the same row's other move button; otherwise it stays on the used button.
  // Runs after `items` changes and consumes the request the move recorded.
  // An `$effect` runs after the DOM has caught up, so the buttons are in
  // their new places.
  $effect(() => {
    void items
    const request = focusRequest
    focusRequest = null
    if (!request) return
    const index = items.findIndex((i) => i.id === request.id)
    if (index < 0) {
      // The item is gone from the list; drop its captured buttons with it.
      delete moveButtons[request.id]
      return
    }
    const row = moveButtons[request.id]
    if (!row) return
    const usedDisabled = request.button === 'up' ? index === 0 : index === items.length - 1
    // React's and Vue's keyed reorders move rows with a single insertBefore,
    // which keeps the focused button focused; Svelte's keyed each detaches and
    // re-inserts the row, which blurs it — so the used button is re-focused
    // explicitly (a no-op when it never lost focus).
    const target = usedDisabled
      ? request.button === 'up'
        ? row.down
        : row.up
      : row[request.button]
    target?.focus()
  })

  /**
   * Initiates a drag operation, storing the dragged item id in the transfer payload.
   *
   * @param id - The dragged item's id.
   * @param event - The drag start event.
   */
  function onDragStart(id: string, event: DragEvent): void {
    event.dataTransfer?.setData('text/plain', id)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    draggingId = id
  }

  /**
   * Marks the hovered item as the current drop target and allows the drop.
   *
   * @param id - The hovered item's id.
   * @param event - The drag over event.
   */
  function onDragOver(id: string, event: DragEvent): void {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    overId = id
  }

  /**
   * Handles a drop event by computing the new item order and calling `onReorder`.
   *
   * @param targetId - The id of the row dropped onto.
   * @param event - The drop event.
   */
  function onDrop(targetId: string, event: DragEvent): void {
    event.preventDefault()
    const sourceId = event.dataTransfer?.getData('text/plain')
    if (!sourceId || sourceId === targetId) {
      reset()
      return
    }
    const from = items.findIndex((item) => item.id === sourceId)
    const to = items.findIndex((item) => item.id === targetId)
    if (from < 0 || to < 0) {
      reset()
      return
    }
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    onReorder(next)
    reset()
  }

  /** Clears dragging and over-target state after a drop or drag-end event. */
  function reset(): void {
    draggingId = null
    overId = null
  }

  /**
   * The translated row position label, rendered in the row's
   * screen-reader-only span.
   *
   * @param index - The row's index.
   * @returns The label.
   */
  function positionLabel(index: number): string {
    return t(
      'reorderableList.position',
      { index: index + 1, total: items.length },
      { defaultValue: 'Item {{index}} of {{total}}' },
    )
  }

  /** The translated "Move up" control label. */
  const moveUpLabel = $derived(t('reorderableList.moveUp', {}, { defaultValue: 'Move up' }))
  /** The translated "Move down" control label. */
  const moveDownLabel = $derived(t('reorderableList.moveDown', {}, { defaultValue: 'Move down' }))
  /** The translated drag handle label. */
  const dragHandleLabel = $derived(
    t('reorderableList.dragHandle', {}, { defaultValue: 'Drag to reorder' }),
  )
</script>

<ul class={cm.cn(cm.stack(1), className)}>
  {#each items as item, index (item.id)}
    <!-- React's reference row IS this markup — a plain `li` carrying the drag
         attributes and handlers, never a focusable widget: the move buttons
         are. So the DOM cannot be changed here without breaking the React DOM
         parity the list exists for. -->
    <li
      draggable={!renderHandle}
      ondragstart={renderHandle ? undefined : (event) => onDragStart(item.id, event)}
      ondragend={reset}
      ondragover={(event) => onDragOver(item.id, event)}
      ondrop={(event) => onDrop(item.id, event)}
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
      style:opacity={draggingId === item.id ? 0.4 : 1}
      style:border-top={overId === item.id && draggingId !== item.id
        ? '2px solid currentColor'
        : ''}
    >
      {#if renderHandle}
        <!-- React's handle is a plain draggable `span` with an aria-label and
             no role; adding one would change the compared DOM. -->
        <!-- Kept: without it Svelte still reports a11y_no_static_element_interactions
             (a `<span>` with a dragstart or dragend handler must have an ARIA role,
             and a role would change the compared DOM). -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span
          draggable="true"
          ondragstart={(event) => onDragStart(item.id, event)}
          ondragend={reset}
          class={cm.cursorPointer}
          aria-label={dragHandleLabel}>{@render renderHandle()}</span
        >
      {/if}
      <div class={cm.flex1}>{@render renderItem(item, draggingId === item.id)}</div>
      <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
        <button
          type="button"
          data-mol-id={`reorderable-move-up-${item.id}`}
          use:moveRef={[item.id, 'up']}
          onclick={() => moveFromButton(item.id, index, -1, 'up')}
          onkeydown={(event) => onButtonKeyDown(item.id, index, 'up', event)}
          disabled={index === 0}
          aria-label={moveUpLabel}
          aria-describedby={`${baseId}-position-${index}`}
          class={cm.cn(cm.cursorPointer, cm.sp('p', 1))}><span aria-hidden="true">↑</span></button
        >
        <button
          type="button"
          data-mol-id={`reorderable-move-down-${item.id}`}
          use:moveRef={[item.id, 'down']}
          onclick={() => moveFromButton(item.id, index, 1, 'down')}
          onkeydown={(event) => onButtonKeyDown(item.id, index, 'down', event)}
          disabled={index === items.length - 1}
          aria-label={moveDownLabel}
          aria-describedby={`${baseId}-position-${index}`}
          class={cm.cn(cm.cursorPointer, cm.sp('p', 1))}><span aria-hidden="true">↓</span></button
        >
      </div>
      <span id={`${baseId}-position-${index}`} class={cm.srOnly}>{positionLabel(index)}</span>
    </li>
  {/each}
</ul>

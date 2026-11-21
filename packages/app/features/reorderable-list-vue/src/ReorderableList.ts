/**
 * Vue drag-handle reorderable list with HTML5 DnD AND keyboard reordering.
 *
 * Vue counterpart of `@molecule/app-reorderable-list-react`'s
 * `ReorderableList` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input. Apps own the data; this component only
 * renders rows and emits the new order on `onReorder`.
 *
 * @module
 */

import {
  defineComponent,
  h,
  type PropType,
  ref,
  useId,
  type VNode,
  type VNodeChild,
  type VNodeRef,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { ReorderableItem } from './types.js'

/**
 * A per-item render function, declared with a `never` parameter so that any
 * `(item: T, isDragging: boolean) => VNodeChild` an app passes is assignable
 * to it (a function parameter is checked contravariantly).
 */
type ItemRenderer = (item: never, isDragging: boolean) => VNodeChild

/**
 * Calls the caller's item renderer with the item it belongs to.
 *
 * @param render - The caller's render function.
 * @param item - The row's item.
 * @param isDragging - Whether the row is being dragged.
 * @returns The node(s) the caller rendered.
 */
const renderRow = (render: ItemRenderer, item: unknown, isDragging: boolean): VNodeChild =>
  (render as (value: unknown, isDragging: boolean) => VNodeChild)(item, isDragging)

/**
 * A reorder handler, declared with a `never` parameter so that any
 * `(next: ReorderableItem<T>[]) => void` an app passes is assignable to it
 * (a function parameter is checked contravariantly).
 */
type ReorderHandler = (next: never[]) => void

/**
 * Calls the caller's reorder handler with the new order.
 *
 * @param handler - The caller's handler.
 * @param next - The full new order.
 */
const emitReorder = (handler: ReorderHandler, next: ReorderableItem<unknown>[]): void =>
  (handler as (next: ReorderableItem<unknown>[]) => void)(next)

/**
 * Drag-handle reorderable list with HTML5 DnD AND keyboard reordering. Apps own
 * the data; this component only renders + emits new order on `onReorder`.
 *
 * Use the optional `renderHandle` slot to limit drag to a specific element
 * (e.g. a "≡" handle on the left). Every row also ships explicit
 * move-up/move-down buttons; Alt+ArrowUp / Alt+ArrowDown on a focused move
 * button reorders too, and focus follows the item: when a move disables the
 * button that was used (the item reached the top or the bottom), focus moves
 * to the same row's other button. The list is fully reorderable without a
 * mouse.
 *
 * Each row renders its position ("Item 2 of 3") in a screen-reader-only span
 * that both of its move buttons reference through `aria-describedby`, so the
 * buttons announce where the item sits.
 *
 * @param props - Component props (see `ReorderableListProps`).
 * @returns The reorderable list component.
 */
export const ReorderableList = defineComponent({
  name: 'ReorderableList',
  props: {
    /** Items in display order. */
    items: {
      type: Array as PropType<readonly ReorderableItem<unknown>[]>,
      required: true,
    },
    /** Called with the new order (full list). */
    onReorder: {
      type: Function as PropType<ReorderHandler>,
      required: true,
    },
    /** Per-item renderer. Receives item + isDragging flag. */
    renderItem: {
      type: Function as PropType<ItemRenderer>,
      required: true,
    },
    /** Optional drag-handle slot — when omitted, the entire row is the drag target. */
    renderHandle: {
      type: Function as PropType<(() => VNodeChild) | undefined>,
      default: undefined,
    },
    /** Extra classes on the list. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const draggingId = ref<string | null>(null)
    const overId = ref<string | null>(null)
    /** The list's id prefix; each row's position span is `${baseId}-position-${index}`. */
    const baseId = useId()
    /** The rows' move buttons, keyed by item id — the focus watcher's targets. */
    const moveButtons = new Map<
      string,
      { up: HTMLButtonElement | null; down: HTMLButtonElement | null }
    >()
    /** The move whose focus settles once `items` changes: the item id and the button used. */
    const focusRequest = ref<{ id: string; button: 'up' | 'down' } | null>(null)

    /**
     * Moves the item at `index` by `delta` positions and emits the new order.
     * No-ops at the list boundaries. Shared by the move buttons and the
     * keyboard (Alt+Arrow) path so mouse and keyboard reordering stay identical.
     *
     * @param index - Current position of the item to move.
     * @param delta - -1 to move up, 1 to move down.
     */
    function moveItem(index: number, delta: -1 | 1): void {
      const to = index + delta
      if (to < 0 || to >= props.items.length) return
      const next = [...props.items]
      const [moved] = next.splice(index, 1)
      next.splice(to, 0, moved!)
      emitReorder(props.onReorder, next)
    }

    /**
     * Keyboard reordering for a focused row: Alt+ArrowUp / Alt+ArrowDown move it.
     * Alt is required so plain arrows still scroll/move the caret and browser
     * history navigation is left untouched.
     *
     * @param index - Position of the focused row.
     * @param e - The keyboard event.
     */
    function onItemKeyDown(index: number, e: KeyboardEvent): void {
      if (!e.altKey) return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveItem(index, -1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveItem(index, 1)
      }
    }

    /**
     * Registers one move button under its item id (a function ref), so the
     * focus watcher can reach either button of that row.
     *
     * @param id - The row's item id.
     * @param button - Which button of the row this is.
     * @returns The function ref for the button.
     */
    function registerMoveButton(id: string, button: 'up' | 'down'): VNodeRef {
      return (el) => {
        const row = moveButtons.get(id) ?? { up: null, down: null }
        row[button] = el instanceof HTMLButtonElement ? el : null
        moveButtons.set(id, row)
      }
    }

    /**
     * Moves the item with a move button, recording which button was used so the
     * focus watcher can settle focus after the new order lands.
     *
     * @param id - The moved item's id.
     * @param index - Current position of the item to move.
     * @param delta - -1 to move up, 1 to move down.
     * @param button - The button the move came from.
     */
    function moveFromButton(id: string, index: number, delta: -1 | 1, button: 'up' | 'down'): void {
      focusRequest.value = { id, button }
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
     * @param e - The keyboard event.
     */
    function onButtonKeyDown(
      id: string,
      index: number,
      button: 'up' | 'down',
      e: KeyboardEvent,
    ): void {
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        focusRequest.value = { id, button }
      }
      onItemKeyDown(index, e)
    }

    // Focus settles after a move: when the button that was used is disabled by
    // the new order (the item reached the top or the bottom), focus moves to
    // the same row's other move button; otherwise it stays (the row is keyed by
    // item id, so the focused button moves with its row). Runs after `items`
    // changes and consumes the request the move recorded.
    watch(
      () => props.items,
      () => {
        const request = focusRequest.value
        focusRequest.value = null
        if (!request) return
        const index = props.items.findIndex((item) => item.id === request.id)
        if (index < 0) return
        const row = moveButtons.get(request.id)
        if (!row) return
        const usedDisabled =
          request.button === 'up' ? index === 0 : index === props.items.length - 1
        if (!usedDisabled) return
        const other = request.button === 'up' ? row.down : row.up
        other?.focus()
      },
      { flush: 'post' },
    )

    /**
     * Initiates a drag operation, storing the dragged item id in the transfer payload.
     *
     * @param id - The dragged item's id.
     * @param e - The drag start event.
     */
    function onDragStart(id: string, e: DragEvent): void {
      e.dataTransfer?.setData('text/plain', id)
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
      draggingId.value = id
    }

    /**
     * Marks the hovered item as the current drop target and allows the drop.
     *
     * @param id - The hovered item's id.
     * @param e - The drag over event.
     */
    function onDragOver(id: string, e: DragEvent): void {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      overId.value = id
    }

    /**
     * Handles a drop event by computing the new item order and calling `onReorder`.
     *
     * @param targetId - The id of the row dropped onto.
     * @param e - The drop event.
     */
    function onDrop(targetId: string, e: DragEvent): void {
      e.preventDefault()
      const sourceId = e.dataTransfer?.getData('text/plain')
      if (!sourceId || sourceId === targetId) {
        reset()
        return
      }
      const from = props.items.findIndex((i) => i.id === sourceId)
      const to = props.items.findIndex((i) => i.id === targetId)
      if (from < 0 || to < 0) {
        reset()
        return
      }
      const next = [...props.items]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved!)
      emitReorder(props.onReorder, next)
      reset()
    }

    /** Clears dragging and over-target state after a drop or drag-end event. */
    function reset(): void {
      draggingId.value = null
      overId.value = null
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
        { index: index + 1, total: props.items.length },
        { defaultValue: 'Item {{index}} of {{total}}' },
      )
    }

    return (): VNode =>
      h('ul', { class: cm.cn(cm.stack(1), props.className) }, [
        props.items.map((item, index) => {
          const isDragging = draggingId.value === item.id
          const isOver = overId.value === item.id && draggingId.value !== item.id
          const positionId = `${baseId}-position-${index}`
          return h(
            'li',
            {
              key: item.id,
              draggable: !props.renderHandle,
              onDragstart: props.renderHandle
                ? undefined
                : (event: DragEvent) => onDragStart(item.id, event),
              onDragend: reset,
              onDragover: (event: DragEvent) => onDragOver(item.id, event),
              onDrop: (event: DragEvent) => onDrop(item.id, event),
              class: cm.cn(cm.flex({ align: 'center', gap: 'sm' })),
              style: {
                opacity: isDragging ? 0.4 : 1,
                borderTop: isOver ? '2px solid currentColor' : undefined,
              },
            },
            [
              ...(props.renderHandle
                ? [
                    h(
                      'span',
                      {
                        draggable: true,
                        onDragstart: (event: DragEvent) => onDragStart(item.id, event),
                        onDragend: reset,
                        class: cm.cursorPointer,
                        'aria-label': t(
                          'reorderableList.dragHandle',
                          {},
                          { defaultValue: 'Drag to reorder' },
                        ),
                      },
                      [props.renderHandle()],
                    ),
                  ]
                : []),
              h('div', { class: cm.flex1 }, [renderRow(props.renderItem, item, isDragging)]),
              h('div', { class: cm.cn(cm.flex({ align: 'center', gap: 'xs' })) }, [
                h(
                  'button',
                  {
                    type: 'button',
                    'data-mol-id': `reorderable-move-up-${item.id}`,
                    ref: registerMoveButton(item.id, 'up'),
                    onClick: () => moveFromButton(item.id, index, -1, 'up'),
                    onKeydown: (event: KeyboardEvent) =>
                      onButtonKeyDown(item.id, index, 'up', event),
                    disabled: index === 0,
                    'aria-label': t('reorderableList.moveUp', {}, { defaultValue: 'Move up' }),
                    'aria-describedby': positionId,
                    class: cm.cn(cm.cursorPointer, cm.sp('p', 1)),
                  },
                  [h('span', { 'aria-hidden': 'true' }, '↑')],
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    'data-mol-id': `reorderable-move-down-${item.id}`,
                    ref: registerMoveButton(item.id, 'down'),
                    onClick: () => moveFromButton(item.id, index, 1, 'down'),
                    onKeydown: (event: KeyboardEvent) =>
                      onButtonKeyDown(item.id, index, 'down', event),
                    disabled: index === props.items.length - 1,
                    'aria-label': t('reorderableList.moveDown', {}, { defaultValue: 'Move down' }),
                    'aria-describedby': positionId,
                    class: cm.cn(cm.cursorPointer, cm.sp('p', 1)),
                  },
                  [h('span', { 'aria-hidden': 'true' }, '↓')],
                ),
              ]),
              h('span', { id: positionId, class: cm.srOnly }, positionLabel(index)),
            ],
          )
        }),
      ])
  },
})

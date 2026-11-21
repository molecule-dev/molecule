/**
 * ReorderableList component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  type OnChanges,
  type SimpleChanges,
  type TemplateRef,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ReorderableItem } from './types.js'

/** Numbers the component instances, so each list's position-span ids are its own. */
let nextListId = 1

/**
 * ReorderableList component.
 *
 * Drag-handle reorder list with HTML5 DnD AND keyboard reordering, the Angular
 * counterpart of `@molecule/app-reorderable-list-react`: the same props (React
 * names), the same ClassMap tokens, and the same DOM for the same input. The
 * host IS the list (`ul[mol-reorderable-list]`), matching React's root exactly.
 * Apps own the data; this component only renders rows and reports the new order
 * through `onReorder`.
 *
 * Use the optional `renderHandle` template to limit drag to a specific element
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
 */
@Component({
  selector: 'ul[mol-reorderable-list]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['items', 'onReorder', 'renderItem', 'renderHandle', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `@for (item of items; track item.id; let i = $index) {
    <li
      [attr.draggable]="rowDraggable()"
      (dragstart)="onRowDragStart(item.id, $event)"
      (dragend)="reset()"
      (dragover)="onDragOver(item.id, $event)"
      (drop)="onDrop(item.id, $event)"
      [class]="rowClasses()"
      [style.opacity]="isDragging(item.id) ? 0.4 : 1"
      [style.border-top]="isOver(item.id) ? '2px solid currentColor' : ''"
    >
      @if (renderHandle) {
        <span
          draggable="true"
          (dragstart)="onDragStart(item.id, $event)"
          (dragend)="reset()"
          [class]="handleClasses()"
          [attr.aria-label]="dragHandleLabel()"
          ><ng-container [ngTemplateOutlet]="renderHandle"></ng-container
        ></span>
      }
      <div [class]="contentClasses()">
        <ng-container
          [ngTemplateOutlet]="renderItem ?? null"
          [ngTemplateOutletContext]="rowContext(item, i)"
        ></ng-container>
      </div>
      <div [class]="controlsClasses()">
        <button
          type="button"
          [attr.data-mol-id]="'reorderable-move-up-' + item.id"
          (click)="moveFromButton(item.id, i, -1, 'up')"
          (keydown)="onButtonKeyDown(item.id, i, 'up', $event)"
          [disabled]="i === 0"
          [attr.aria-label]="moveUpLabel()"
          [attr.aria-describedby]="positionId(i)"
          [class]="buttonClasses()"
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          type="button"
          [attr.data-mol-id]="'reorderable-move-down-' + item.id"
          (click)="moveFromButton(item.id, i, 1, 'down')"
          (keydown)="onButtonKeyDown(item.id, i, 'down', $event)"
          [disabled]="i === items.length - 1"
          [attr.aria-label]="moveDownLabel()"
          [attr.aria-describedby]="positionId(i)"
          [class]="buttonClasses()"
        >
          <span aria-hidden="true">↓</span>
        </button>
      </div>
      <span [attr.id]="positionId(i)" [class]="srOnlyClasses()">{{ positionLabel(i) }}</span>
    </li>
  }`,
})
export class ReorderableList<T = unknown> implements OnChanges {
  /** Items in display order (React's `items`). */
  items: readonly ReorderableItem<T>[] = []
  /** Called with the new order (full list). */
  onReorder?: (next: ReorderableItem<T>[]) => void
  /** Per-item template; its context carries `a0` = item and `a1` = isDragging. */
  renderItem?: TemplateRef<unknown>
  /** Optional drag-handle template — when omitted, the entire row is the drag target. */
  renderHandle?: TemplateRef<unknown>
  /** Extra classes on the list. */
  className?: string

  /** The current dragging item id, or null. */
  private draggingId: string | null = null
  /** The current drop-target item id, or null. */
  private overId: string | null = null

  /** The list's id prefix; each row's position span is `${baseId}-position-${index}`. */
  protected readonly baseId = `reorderable-list-${nextListId++}`

  /** The move whose focus settles once `items` changes: the item id and the button used. */
  private focusRequest: { id: string; button: 'up' | 'down' } | null = null

  /** The component host (the root `<ul>`), whose rows the focus settling queries. */
  private readonly host = inject(ElementRef<HTMLElement>)
  /** The injector `afterNextRender` needs outside a constructor. */
  private readonly injector = inject(Injector)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the labels on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * Moves the item at `index` by `delta` positions and emits the new order.
   * No-ops at the list boundaries, exactly as React's `moveItem` does.
   *
   * @param index - Current position of the item to move.
   * @param delta - -1 to move up, 1 to move down.
   */
  moveItem(index: number, delta: -1 | 1): void {
    const to = index + delta
    if (to < 0 || to >= this.items.length) return
    const next = [...this.items]
    const [moved] = next.splice(index, 1)
    next.splice(to, 0, moved!)
    this.onReorder?.(next)
  }

  /**
   * Keyboard reordering for a focused row: Alt+ArrowUp / Alt+ArrowDown move it.
   * Alt is required so plain arrows still scroll/move the caret and browser
   * history navigation is left untouched.
   *
   * @param index - Position of the focused row.
   * @param event - The keyboard event.
   */
  onItemKeyDown(index: number, event: KeyboardEvent): void {
    if (!event.altKey) return
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      this.moveItem(index, -1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.moveItem(index, 1)
    }
  }

  /**
   * Records the move a move button made and settles its focus once the new
   * order has rendered (see {@link settleFocus}).
   *
   * @param id - The moved item's id.
   * @param index - Current position of the item to move.
   * @param delta - -1 to move up, 1 to move down.
   * @param button - The button the move came from.
   */
  moveFromButton(id: string, index: number, delta: -1 | 1, button: 'up' | 'down'): void {
    this.focusRequest = { id, button }
    this.moveItem(index, delta)
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
  onButtonKeyDown(id: string, index: number, button: 'up' | 'down', event: KeyboardEvent): void {
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      this.focusRequest = { id, button }
    }
    this.onItemKeyDown(index, event)
  }

  /**
   * The settle point for a recorded move: `items` changed, so schedule the
   * focus settle after this change detection pass, when the rows are in their
   * new places.
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['items']) return
    const request = this.focusRequest
    this.focusRequest = null
    if (!request) return
    afterNextRender(() => this.settleFocus(request), { injector: this.injector })
  }

  /**
   * Settles focus after a move: when the button that was used is disabled by
   * the new order (the item reached the top or the bottom), focus moves to
   * the same row's other move button; otherwise it stays on the used button.
   * React's and Vue's keyed reorders move rows with a single insertBefore,
   * which keeps the focused button focused; Angular's keyed `@for` detaches
   * and re-inserts the row, which blurs it — so the settle target is focused
   * explicitly in both branches (a no-op when it never lost focus).
   *
   * @param request - The move the button made (the item id and the button used).
   */
  private settleFocus(request: { id: string; button: 'up' | 'down' }): void {
    const index = this.items.findIndex((item) => item.id === request.id)
    if (index < 0) return
    const usedDisabled = request.button === 'up' ? index === 0 : index === this.items.length - 1
    const targetButton = usedDisabled ? (request.button === 'up' ? 'down' : 'up') : request.button
    const target = this.host.nativeElement.querySelector(
      `[data-mol-id="reorderable-move-${targetButton}-${CSS.escape(request.id)}"]`,
    ) as HTMLButtonElement | null
    target?.focus()
  }

  /**
   * The id of the row's screen-reader-only position span, which both of its
   * move buttons reference through `aria-describedby`.
   *
   * @param index - The row's index.
   * @returns The span's id.
   */
  positionId(index: number): string {
    return `${this.baseId}-position-${index}`
  }

  /**
   * Initiates a drag operation, storing the dragged item id in the transfer payload.
   *
   * @param id - The dragged item's id.
   * @param event - The drag start event.
   */
  onDragStart(id: string, event: DragEvent): void {
    event.dataTransfer?.setData('text/plain', id)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    this.draggingId = id
  }

  /**
   * React's `onDragStart` on the row — present only when no handle is
   * rendered (a handle makes the row itself non-draggable).
   *
   * @param id - The dragged item's id.
   * @param event - The drag start event.
   */
  onRowDragStart(id: string, event: DragEvent): void {
    if (this.renderHandle) return
    this.onDragStart(id, event)
  }

  /**
   * Marks the hovered item as the current drop target and allows the drop.
   *
   * @param id - The hovered item's id.
   * @param event - The drag over event.
   */
  onDragOver(id: string, event: DragEvent): void {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    this.overId = id
  }

  /**
   * Handles a drop event by computing the new item order and calling `onReorder`.
   *
   * @param targetId - The id of the row dropped onto.
   * @param event - The drop event.
   */
  onDrop(targetId: string, event: DragEvent): void {
    event.preventDefault()
    const sourceId = event.dataTransfer?.getData('text/plain')
    if (!sourceId || sourceId === targetId) {
      this.reset()
      return
    }
    const from = this.items.findIndex((item) => item.id === sourceId)
    const to = this.items.findIndex((item) => item.id === targetId)
    if (from < 0 || to < 0) {
      this.reset()
      return
    }
    const next = [...this.items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    this.onReorder?.(next)
    this.reset()
  }

  /** Clears dragging and over-target state after a drop or drag-end event. */
  reset(): void {
    this.draggingId = null
    this.overId = null
  }

  /**
   * Whether the row with this id is being dragged.
   *
   * @param id - The row's item id.
   * @returns True while it is the dragged item.
   */
  isDragging(id: string): boolean {
    return this.draggingId === id
  }

  /**
   * Whether the row with this id is the current, non-dragged drop target.
   *
   * @param id - The row's item id.
   * @returns True when the border draws on it.
   */
  isOver(id: string): boolean {
    return this.overId === id && this.draggingId !== id
  }

  /**
   * The row's draggable attribute — `"true"` unless a handle is rendered.
   *
   * @returns The attribute value.
   */
  rowDraggable(): 'true' | 'false' {
    return this.renderHandle ? 'false' : 'true'
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The list's class (`cm.stack(1)` + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(1), this.className)
  }

  /**
   * The row's class (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }))
  }

  /**
   * The drag handle's class (`cm.cursorPointer`).
   * @returns The class string.
   */
  handleClasses(): string {
    return this.cm().cn(this.cm().cursorPointer)
  }

  /**
   * The item content's class (`cm.flex1`).
   * @returns The class string.
   */
  contentClasses(): string {
    return this.cm().cn(this.cm().flex1)
  }

  /**
   * The move controls' class (`cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  controlsClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }))
  }

  /**
   * The move buttons' class (`cm.cursorPointer` + `cm.sp('p', 1)`).
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(this.cm().cursorPointer, this.cm().sp('p', 1))
  }

  /**
   * The position span's class (`cm.srOnly`).
   * @returns The class string.
   */
  srOnlyClasses(): string {
    return this.cm().cn(this.cm().srOnly)
  }

  /**
   * The translated row position label, rendered in the row's
   * screen-reader-only span.
   *
   * @param index - The row's index.
   * @returns The label.
   */
  positionLabel(index: number): string {
    return this.i18n.t(
      'reorderableList.position',
      { index: index + 1, total: this.items.length },
      { defaultValue: 'Item {{index}} of {{total}}' },
    )
  }

  /**
   * The translated "Move up" control label.
   * @returns The label.
   */
  moveUpLabel(): string {
    return this.i18n.t('reorderableList.moveUp', {}, { defaultValue: 'Move up' })
  }

  /**
   * The translated "Move down" control label.
   * @returns The label.
   */
  moveDownLabel(): string {
    return this.i18n.t('reorderableList.moveDown', {}, { defaultValue: 'Move down' })
  }

  /**
   * The translated drag handle label.
   * @returns The label.
   */
  dragHandleLabel(): string {
    return this.i18n.t('reorderableList.dragHandle', {}, { defaultValue: 'Drag to reorder' })
  }

  /**
   * The template context for one row: the item as `a0` and the drag flag as
   * `a1` (React calls `renderItem(item, isDragging)`).
   *
   * @param item - The row's item.
   * @param index - The row's index.
   * @returns The template context.
   */
  rowContext(item: ReorderableItem<T>, index: number): Record<string, unknown> {
    return { a0: item, a1: this.isDragging(item.id), a2: index }
  }
}

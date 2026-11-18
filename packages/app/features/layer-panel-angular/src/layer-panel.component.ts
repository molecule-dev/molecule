/**
 * LayerPanel component (React parity).
 *
 * @module
 */

import { afterNextRender, Component, ElementRef, inject, Injector, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { Layer, LayerPanelProps } from './types.js'
import { formatOpacityPercent, moveLayer } from './utilities.js'

/**
 * LayerPanel component.
 *
 * Photoshop / Figma–style layer panel: a vertical, drag-to-reorder list of
 * layers with eye/lock toggles, inline rename (double-click), and
 * click-to-select. All interactions emit intent callbacks; the host
 * application owns the data and re-renders with the next `layers` array.
 *
 * It is the Angular counterpart of `@molecule/app-layer-panel-react`'s
 * `LayerPanel`: the same props (React names), the same ClassMap tokens and the
 * same DOM for the same input. The host IS the outer `<ul>`
 * (`ul[mol-layer-panel]`), matching React's root exactly.
 *
 * Drag-to-reorder uses pointer events (no `@dnd-kit` or HTML5 DnD
 * dependency), so it works on touch surfaces and inside transformed canvases
 * without quirks. The visual convention is top-down — index 0 is the
 * front-most layer.
 */
@Component({
  selector: 'ul[mol-layer-panel]',
  standalone: true,
  inputs: [
    'layers',
    'onReorder',
    'onVisibilityToggle',
    'onLockToggle',
    'onSelect',
    'onRename',
    'activeId',
    'className',
  ],
  host: {
    'data-mol-id': 'layer-panel',
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
  },
  template: `@for (layer of layers; track layer.id; let index = $index) {
    <li
      [attr.data-mol-id]="'layer-panel-row-' + layer.id"
      [attr.data-layer-index]="index"
      (pointerdown)="onRowPointerDown(index, layer, $event)"
      (pointermove)="onRowPointerMove($event)"
      (pointerup)="endDrag()"
      (pointercancel)="endDrag()"
      [class]="rowClasses()"
      [style]="rowStyle(layer, index)"
    >
      <button
        type="button"
        (click)="toggleVisibility(layer)"
        [attr.aria-label]="visibilityLabel(layer)"
        [attr.title]="visibilityLabel(layer)"
        [attr.aria-pressed]="!layer.visible"
        [attr.data-mol-id]="'layer-panel-visibility-' + layer.id"
        [class]="toggleClasses()"
        [style]="toggleStyle"
      >
        <span aria-hidden="true">{{ layer.visible ? eyeVisible : eyeHidden }}</span>
      </button>

      <button
        type="button"
        (click)="toggleLock(layer)"
        [attr.aria-label]="lockLabel(layer)"
        [attr.title]="lockLabel(layer)"
        [attr.aria-pressed]="layer.locked"
        [attr.data-mol-id]="'layer-panel-lock-' + layer.id"
        [class]="toggleClasses()"
        [style]="toggleStyle"
      >
        <span aria-hidden="true">{{ layer.locked ? lockLocked : lockUnlocked }}</span>
      </button>

      @if (layer.thumbnail) {
        <img [attr.src]="layer.thumbnail" alt="" aria-hidden="true" [style]="thumbnailStyle" />
      }

      <div [class]="nameSlotClasses()" (dblclick)="onNameSlotDoubleClick(layer, $event)">
        @if (isEditing(layer)) {
          <input
            type="text"
            [attr.value]="layer.name"
            (input)="onRenameInput($event)"
            (focusout)="commitRename(layer)"
            (keydown)="onRenameKeyDown($event, layer)"
            (pointerdown)="onRenamePointerDown($event)"
            [attr.aria-label]="renameLabel()"
            [attr.data-mol-id]="'layer-panel-rename-' + layer.id"
            [style]="renameFieldStyle"
          />
        } @else {
          <button
            type="button"
            (click)="select(layer)"
            [attr.aria-current]="isActive(layer) ? 'true' : null"
            [attr.data-mol-id]="'layer-panel-name-' + layer.id"
            [class]="nameClasses()"
            [style]="nameStyle"
          >
            {{ layer.name }}
          </button>
        }
      </div>

      @if (layer.blendMode || opacityLabel(layer)) {
        <span
          [attr.aria-label]="metadataLabel()"
          [attr.data-mol-id]="'layer-panel-meta-' + layer.id"
          [style]="metadataStyle"
          >{{ metaText(layer) }}</span
        >
      }
    </li>
  }`,
})
export class LayerPanel {
  /** Ordered layers, top-down (React's `layers`). */
  layers: Layer[] = []

  /** Called with the full reordered list after a drag completes. */
  onReorder?: LayerPanelProps['onReorder']
  /** Called when the eye icon is clicked. */
  onVisibilityToggle?: LayerPanelProps['onVisibilityToggle']
  /** Called when the lock icon is clicked. */
  onLockToggle?: LayerPanelProps['onLockToggle']
  /** Called when a row's name button is clicked. */
  onSelect?: LayerPanelProps['onSelect']
  /** Called when an inline rename commits with a non-empty trimmed value. */
  onRename?: LayerPanelProps['onRename']

  /** Currently active layer id. */
  activeId?: string
  /** Optional extra classes appended to the panel root. */
  className?: string

  /** The layer being dragged, or null. */
  protected readonly draggingId = signal<string | null>(null)
  /** The row index the drag is over, or null. */
  protected readonly overIndex = signal<number | null>(null)
  /** The layer whose rename field is open, or null. */
  protected readonly editingId = signal<string | null>(null)

  /** The rename field's current text (React's `editingValueRef`). */
  private editingValue = ''
  /** The index a drag started from. */
  private dragStartIndex: number | null = null

  /** The component host, whose subtree the rename field is found in. */
  private readonly host = inject(ElementRef<HTMLElement>)
  /** The injector `afterNextRender` needs outside a constructor. */
  private readonly injector = inject(Injector)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /** The eye glyphs React renders: visible, and visible with a combining slash. */
  protected readonly eyeVisible = '\u{1F441}'
  protected readonly eyeHidden = '\u{1F441}\u{0338}'
  /** The lock glyphs React renders: locked, and unlocked. */
  protected readonly lockLocked = '\u{1F512}'
  protected readonly lockUnlocked = '\u{1F513}'

  /** The icon-only toggles' style: React's inline reset for a bare glyph button. */
  protected readonly toggleStyle: Record<string, string> = {
    background: 'transparent',
    border: 'none',
    padding: '0',
  }

  /** The layer-name button's style: React's native reset for a text-only button. */
  protected readonly nameStyle: Record<string, string> = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '0',
    font: 'inherit',
    color: 'inherit',
    'text-align': 'left',
  }

  /** The thumbnail's style. */
  protected readonly thumbnailStyle: Record<string, string> = {
    width: '24px',
    height: '24px',
    'object-fit': 'cover',
    'flex-shrink': '0',
  }

  /** The rename field's style. */
  protected readonly renameFieldStyle: Record<string, string> = { width: '100%' }

  /** The metadata badge's style. */
  protected readonly metadataStyle: Record<string, string> = {
    'font-size': '0.75em',
    opacity: '0.7',
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The panel root's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(0 as const), this.className)
  }

  /**
   * A row's class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().cursorPointer)
  }

  /**
   * An eye / lock toggle's class list.
   * @returns The class string.
   */
  toggleClasses(): string {
    return this.cm().cn(this.cm().cursorPointer, this.cm().touchTarget)
  }

  /**
   * The name slot's class list.
   * @returns The class string.
   */
  nameSlotClasses(): string {
    return this.cm().flex1
  }

  /**
   * A layer-name button's class list.
   * @returns The class string.
   */
  nameClasses(): string {
    return this.cm().cn(this.cm().cursorPointer)
  }

  /**
   * A row's inline style, matching React's style object for the same drag /
   * visibility / active state.
   *
   * @param layer - The layer in this row.
   * @param index - The row's index.
   * @returns The style map.
   */
  rowStyle(layer: Layer, index: number): Record<string, string | number> {
    const isDragging = layer.id === this.draggingId()
    const isOver =
      this.overIndex() === index && this.draggingId() !== null && this.draggingId() !== layer.id
    const style: Record<string, string | number> = {
      opacity: isDragging ? 0.4 : layer.visible ? 1 : 0.55,
      padding: '4px 8px',
    }
    if (isOver) style['border-top'] = '2px solid currentColor'
    if (this.isActive(layer)) style.outline = '2px solid currentColor'
    return style
  }

  /**
   * Whether this layer is the active one.
   *
   * @param layer - The layer in this row.
   * @returns True when it is `activeId`.
   */
  isActive(layer: Layer): boolean {
    return layer.id === this.activeId
  }

  /**
   * Whether this layer's rename field is open.
   *
   * @param layer - The layer in this row.
   * @returns True while it is being renamed.
   */
  isEditing(layer: Layer): boolean {
    return this.editingId() === layer.id
  }

  /**
   * The panel's accessible name.
   * @returns The translated listbox label.
   */
  label(): string {
    return this.i18n.t('layerPanel.label', {}, { defaultValue: 'Layers' })
  }

  /**
   * The rename field's accessible name.
   * @returns The translated label.
   */
  renameLabel(): string {
    return this.i18n.t('layerPanel.renameInput', {}, { defaultValue: 'Rename layer' })
  }

  /**
   * The metadata badge's accessible name.
   * @returns The translated label.
   */
  metadataLabel(): string {
    return this.i18n.t('layerPanel.metadata', {}, { defaultValue: 'Layer metadata' })
  }

  /**
   * The eye button's accessible name, following the layer's visibility.
   *
   * @param layer - The layer in this row.
   * @returns The translated label.
   */
  visibilityLabel(layer: Layer): string {
    return layer.visible
      ? this.i18n.t('layerPanel.hide', {}, { defaultValue: 'Hide layer' })
      : this.i18n.t('layerPanel.show', {}, { defaultValue: 'Show layer' })
  }

  /**
   * The lock button's accessible name, following the layer's lock.
   *
   * @param layer - The layer in this row.
   * @returns The translated label.
   */
  lockLabel(layer: Layer): string {
    return layer.locked
      ? this.i18n.t('layerPanel.unlock', {}, { defaultValue: 'Unlock layer' })
      : this.i18n.t('layerPanel.lock', {}, { defaultValue: 'Lock layer' })
  }

  /**
   * The formatted opacity of a layer (`""` when it has none).
   *
   * @param layer - The layer in this row.
   * @returns The percent string, or an empty string.
   */
  opacityLabel(layer: Layer): string {
    return formatOpacityPercent(layer.opacity)
  }

  /**
   * The metadata badge's text: the blend mode, the opacity percent, or both
   * joined by a middle dot.
   *
   * @param layer - The layer in this row.
   * @returns The badge text.
   */
  metaText(layer: Layer): string {
    const opacityLabel = this.opacityLabel(layer)
    return `${layer.blendMode ?? ''}${layer.blendMode && opacityLabel ? ' · ' : ''}${opacityLabel}`
  }

  /**
   * Capture the initial pointer position + index when a drag handle row
   * begins a pointer-down sequence. We don't actually start the visual drag
   * until the pointer moves — that lets a plain click still register as a
   * "select" without flickering into drag mode.
   *
   * @param index - Index of the row receiving the pointer-down.
   * @param layer - The layer in that row.
   * @param event - The originating pointer event.
   */
  onRowPointerDown(index: number, layer: Layer, event: PointerEvent): void {
    if (event.button !== 0) return
    if (layer.locked) return
    this.dragStartIndex = index
    this.draggingId.set(layer.id)
    this.overIndex.set(index)
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId)
  }

  /**
   * Track which row the pointer is currently over while a drag is in flight.
   * We compute the target index from the row element under the pointer
   * (looked up via `data-mol-id`) so this works inside scrollable containers.
   *
   * @param event - The pointer-move event.
   */
  onRowPointerMove(event: PointerEvent): void {
    if (this.draggingId() === null) return
    const target = document.elementFromPoint(event.clientX, event.clientY)
    if (!target) return
    const row = target.closest('[data-mol-id^="layer-panel-row-"]') as HTMLElement | null
    if (!row) return
    const idx = Number(row.dataset.layerIndex)
    if (Number.isFinite(idx)) this.overIndex.set(idx)
  }

  /**
   * Commit the drag — call `onReorder` with the new array if the destination
   * differs from the source — and reset all transient drag state.
   */
  endDrag(): void {
    const over = this.overIndex()
    if (this.draggingId() !== null && this.dragStartIndex !== null && over !== null) {
      const next = moveLayer(this.layers, this.dragStartIndex, over)
      if (next !== this.layers) this.onReorder?.(next)
    }
    this.dragStartIndex = null
    this.draggingId.set(null)
    this.overIndex.set(null)
  }

  /**
   * Begin inline rename of the given layer. No-op when the layer is locked.
   *
   * @param layer - The layer to rename.
   */
  startRename(layer: Layer): void {
    if (layer.locked) return
    this.editingValue = layer.name
    this.editingId.set(layer.id)
    // React focuses and selects the field in an effect after it mounts; there
    // is no field before this render, so focus after the next one.
    afterNextRender(
      () => {
        const field = this.host.nativeElement.querySelector('input')
        if (field instanceof HTMLInputElement) {
          field.focus()
          field.select()
        }
      },
      { injector: this.injector },
    )
  }

  /**
   * The name slot's double-click: start renaming (React stops the event so the
   * row's own handlers never see it).
   *
   * @param layer - The layer in this row.
   * @param event - The double-click event.
   */
  onNameSlotDoubleClick(layer: Layer, event: MouseEvent): void {
    event.stopPropagation()
    this.startRename(layer)
  }

  /**
   * Keep a pointer press inside the rename field from starting a row drag.
   *
   * @param event - The pointer event.
   */
  onRenamePointerDown(event: PointerEvent): void {
    event.stopPropagation()
  }

  /**
   * Commit the in-flight rename if the trimmed value is non-empty and differs
   * from the original; either way clear the editing state.
   *
   * @param layer - The layer whose rename is being committed.
   */
  commitRename(layer: Layer): void {
    const next = this.editingValue.trim()
    if (next.length > 0 && next !== layer.name) {
      this.onRename?.(layer.id, next)
    }
    this.editingId.set(null)
  }

  /** Cancel an inline rename without persisting. */
  cancelRename(): void {
    this.editingId.set(null)
  }

  /**
   * Receives each typed value (React's `onChange`).
   *
   * @param event - The native `input` event.
   */
  onRenameInput(event: Event): void {
    this.editingValue = (event.target as HTMLInputElement).value
  }

  /**
   * Convert keyboard input on the rename `<input>` to commit (Enter) or
   * cancel (Escape) intents.
   *
   * @param event - The keyboard event.
   * @param layer - The layer being renamed.
   */
  onRenameKeyDown(event: KeyboardEvent, layer: Layer): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      this.commitRename(layer)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelRename()
    }
  }

  /**
   * Report an eye-toggle click (React's `onVisibilityToggle`).
   *
   * @param layer - The layer in this row.
   */
  toggleVisibility(layer: Layer): void {
    this.onVisibilityToggle?.(layer.id)
  }

  /**
   * Report a lock-toggle click (React's `onLockToggle`).
   *
   * @param layer - The layer in this row.
   */
  toggleLock(layer: Layer): void {
    this.onLockToggle?.(layer.id)
  }

  /**
   * Report a name-button click (React's `onSelect`).
   *
   * @param layer - The layer in this row.
   */
  select(layer: Layer): void {
    this.onSelect?.(layer.id)
  }
}

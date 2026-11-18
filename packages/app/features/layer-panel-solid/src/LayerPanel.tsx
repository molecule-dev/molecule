import { type Component, createEffect, createSignal, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { Layer, LayerPanelProps } from './types.js'
import { formatOpacityPercent, moveLayer } from './utilities.js'

/** The icon-only toggle's style: React's inline reset for a bare glyph button. */
const TOGGLE_STYLE: Record<string, string> = {
  background: 'transparent',
  border: 'none',
  padding: '0',
}

/** The layer-name button's style: React's native reset for a text-only button. */
const NAME_STYLE: Record<string, string> = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  padding: '0',
  font: 'inherit',
  color: 'inherit',
  'text-align': 'left',
}

/** The metadata badge's style. */
const META_STYLE: Record<string, string> = {
  'font-size': '0.75em',
  opacity: '0.7',
}

/**
 * Photoshop / Figma–style layer panel.
 *
 * Renders a vertical, drag-to-reorder list of layers with eye/lock
 * toggles, inline rename (double-click), and click-to-select. All
 * interactions emit intent callbacks; the host application owns the
 * data and re-renders with the next `layers` array.
 *
 * Drag-to-reorder uses pointer events (no `@dnd-kit` or HTML5 DnD
 * dependency), so it works on touch surfaces and inside transformed
 * canvases without quirks. The visual convention is top-down — index 0
 * is the front-most layer.
 *
 * This is the Solid counterpart of `@molecule/app-layer-panel-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link LayerPanelProps}).
 * @returns The rendered layer panel.
 */
export const LayerPanel: Component<LayerPanelProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** The layer being dragged, or null. */
  const [draggingId, setDraggingId] = createSignal<string | null>(null)
  /** The row index the drag is over, or null. */
  const [overIndex, setOverIndex] = createSignal<number | null>(null)
  /** The layer whose rename field is open, or null. */
  const [editingId, setEditingId] = createSignal<string | null>(null)
  /** The rename field's current text (React's `editingValueRef`). */
  let editingValue = ''
  /** The index a drag started from. */
  let dragStartIndex: number | null = null
  /** The open rename field, focused once each time editing starts. */
  let renameInput: HTMLInputElement | undefined

  // React's `useEffect(() => { … focus(); select() }, [editingId])`.
  createEffect(() => {
    if (editingId() !== null && renameInput) {
      renameInput.focus()
      renameInput.select()
    }
  })

  /**
   * Capture the initial pointer position + index when a drag handle row
   * begins a pointer-down sequence. We don't actually start the visual
   * drag until the pointer moves — that lets a plain click still
   * register as a "select" without flickering into drag mode.
   *
   * @param index - Index of the row receiving the pointer-down.
   * @param layer - The layer in that row.
   * @param event - The originating pointer event.
   */
  const onRowPointerDown = (index: number, layer: Layer, event: PointerEvent): void => {
    if (event.button !== 0) return
    if (layer.locked) return
    dragStartIndex = index
    setDraggingId(layer.id)
    setOverIndex(index)
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId)
  }

  /**
   * Track which row the pointer is currently over while a drag is in
   * flight. We compute the target index from the row element under the
   * pointer (looked up via `data-mol-id`) so this works inside scrollable
   * containers.
   *
   * @param event - The pointer-move event.
   */
  const onRowPointerMove = (event: PointerEvent): void => {
    if (draggingId() === null) return
    const target = document.elementFromPoint(event.clientX, event.clientY)
    if (!target) return
    const row = target.closest('[data-mol-id^="layer-panel-row-"]') as HTMLElement | null
    if (!row) return
    const idx = Number(row.dataset.layerIndex)
    if (Number.isFinite(idx)) setOverIndex(idx)
  }

  /**
   * Commit the drag — call `onReorder` with the new array if the
   * destination differs from the source — and reset all transient drag
   * state.
   */
  const endDrag = (): void => {
    if (draggingId() !== null && dragStartIndex !== null && overIndex() !== null) {
      const next = moveLayer(props.layers, dragStartIndex, overIndex()!)
      if (next !== props.layers) props.onReorder(next)
    }
    dragStartIndex = null
    setDraggingId(null)
    setOverIndex(null)
  }

  /**
   * Begin inline rename of the given layer. No-op when the layer is
   * locked.
   *
   * @param layer - The layer to rename.
   */
  const startRename = (layer: Layer): void => {
    if (layer.locked) return
    editingValue = layer.name
    setEditingId(layer.id)
  }

  /**
   * Close the rename field. Solid applies a signal write synchronously, while
   * React batches the same write and flushes it after the event dispatch, so
   * the field outlives the event that closed it. Deferring the write to a
   * microtask gives the field the same lifetime React gives it (and keeps the
   * commit idempotent when one close arrives on two events).
   */
  const closeEditor = (): void => {
    queueMicrotask(() => setEditingId(null))
  }

  /**
   * Commit the in-flight rename if the trimmed value is non-empty and
   * differs from the original; either way clear the editing state.
   *
   * @param layer - The layer whose rename is being committed.
   */
  const commitRename = (layer: Layer): void => {
    const next = editingValue.trim()
    if (next.length > 0 && next !== layer.name) {
      props.onRename(layer.id, next)
    }
    closeEditor()
  }

  /** Cancel an inline rename without persisting. */
  const cancelRename = (): void => {
    closeEditor()
  }

  /**
   * Convert keyboard input on the rename `<input>` to commit (Enter) or
   * cancel (Escape) intents.
   *
   * @param event - The keyboard event.
   * @param layer - The layer being renamed.
   */
  const onRenameKeyDown = (event: KeyboardEvent, layer: Layer): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename(layer)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelRename()
    }
  }

  /**
   * The row's inline style, matching React's style object for the same
   * drag / visibility / active state.
   *
   * @param layer - The layer in this row.
   * @param index - The row's index.
   * @returns The style object (dash-case keys, as Solid's `style` prop takes them).
   */
  const rowStyle = (layer: Layer, index: number): Record<string, string | number | undefined> => {
    const isDragging = layer.id === draggingId()
    const isOver = overIndex() === index && draggingId() !== null && draggingId() !== layer.id
    return {
      opacity: isDragging ? 0.4 : layer.visible ? 1 : 0.55,
      'border-top': isOver ? '2px solid currentColor' : undefined,
      padding: '4px 8px',
      outline: layer.id === props.activeId ? '2px solid currentColor' : undefined,
    }
  }

  /**
   * The metadata badge's text: the blend mode, the opacity percent, or both
   * joined by a middle dot.
   *
   * @param layer - The layer in this row.
   * @param opacityLabel - The formatted opacity (`""` when absent).
   * @returns The badge text.
   */
  const metaText = (layer: Layer, opacityLabel: string): string =>
    `${layer.blendMode ?? ''}${layer.blendMode && opacityLabel ? ' · ' : ''}${opacityLabel}`

  return (
    <ul
      class={cm.cn(cm.stack(0 as const), props.className)}
      aria-label={t('layerPanel.label', {}, { defaultValue: 'Layers' })}
      data-mol-id="layer-panel"
    >
      <For each={props.layers}>
        {(layer, index) => {
          const isActive = (): boolean => layer.id === props.activeId
          const isEditing = (): boolean => editingId() === layer.id
          const opacityLabel = (): string => formatOpacityPercent(layer.opacity)
          const visibilityLabel = (): string =>
            layer.visible
              ? t('layerPanel.hide', {}, { defaultValue: 'Hide layer' })
              : t('layerPanel.show', {}, { defaultValue: 'Show layer' })
          const lockLabel = (): string =>
            layer.locked
              ? t('layerPanel.unlock', {}, { defaultValue: 'Unlock layer' })
              : t('layerPanel.lock', {}, { defaultValue: 'Lock layer' })

          return (
            <li
              data-mol-id={`layer-panel-row-${layer.id}`}
              data-layer-index={index()}
              onPointerDown={(event: PointerEvent) => onRowPointerDown(index(), layer, event)}
              onPointerMove={(event: PointerEvent) => onRowPointerMove(event)}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.cursorPointer)}
              style={rowStyle(layer, index())}
            >
              <button
                type="button"
                onClick={() => props.onVisibilityToggle(layer.id)}
                aria-label={visibilityLabel()}
                title={visibilityLabel()}
                aria-pressed={!layer.visible}
                data-mol-id={`layer-panel-visibility-${layer.id}`}
                class={cm.cn(cm.cursorPointer, cm.touchTarget)}
                style={TOGGLE_STYLE}
              >
                <span aria-hidden="true">{layer.visible ? '\u{1F441}' : '\u{1F441}\u{0338}'}</span>
              </button>

              <button
                type="button"
                onClick={() => props.onLockToggle(layer.id)}
                aria-label={lockLabel()}
                title={lockLabel()}
                aria-pressed={layer.locked}
                data-mol-id={`layer-panel-lock-${layer.id}`}
                class={cm.cn(cm.cursorPointer, cm.touchTarget)}
                style={TOGGLE_STYLE}
              >
                <span aria-hidden="true">{layer.locked ? '\u{1F512}' : '\u{1F513}'}</span>
              </button>

              <Show when={layer.thumbnail}>
                {(thumbnail) => (
                  <img
                    src={thumbnail()}
                    alt=""
                    aria-hidden="true"
                    style={{
                      width: '24px',
                      height: '24px',
                      'object-fit': 'cover',
                      'flex-shrink': '0',
                    }}
                  />
                )}
              </Show>

              <div
                class={cm.flex1}
                onDblClick={(event: MouseEvent) => {
                  event.stopPropagation()
                  startRename(layer)
                }}
              >
                <Show
                  when={isEditing()}
                  fallback={
                    <button
                      type="button"
                      onClick={() => props.onSelect(layer.id)}
                      aria-current={isActive() ? 'true' : undefined}
                      data-mol-id={`layer-panel-name-${layer.id}`}
                      class={cm.cn(cm.cursorPointer)}
                      style={NAME_STYLE}
                    >
                      {layer.name}
                    </button>
                  }
                >
                  <input
                    type="text"
                    ref={(element) => {
                      renameInput = element
                      // React's `defaultValue`: the value attribute, which a
                      // typed value does not overwrite.
                      element.setAttribute('value', layer.name)
                    }}
                    onInput={(event: Event) => {
                      editingValue = (event.currentTarget as HTMLInputElement).value
                    }}
                    // React's `onBlur` listens to `focusout` (blur does not bubble).
                    onfocusout={() => commitRename(layer)}
                    onKeyDown={(event: KeyboardEvent) => onRenameKeyDown(event, layer)}
                    onPointerDown={(event: PointerEvent) => event.stopPropagation()}
                    aria-label={t('layerPanel.renameInput', {}, { defaultValue: 'Rename layer' })}
                    data-mol-id={`layer-panel-rename-${layer.id}`}
                    style={{ width: '100%' }}
                  />
                </Show>
              </div>

              <Show when={layer.blendMode || opacityLabel()}>
                <span
                  aria-label={t('layerPanel.metadata', {}, { defaultValue: 'Layer metadata' })}
                  data-mol-id={`layer-panel-meta-${layer.id}`}
                  style={META_STYLE}
                >
                  {metaText(layer, opacityLabel())}
                </span>
              </Show>
            </li>
          )
        }}
      </For>
    </ul>
  )
}

import type { KeyboardEvent, PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { Layer } from './types.js'
import { formatOpacityPercent, moveLayer } from './utilities.js'

/**
 * Public props for `<LayerPanel>`.
 */
export interface LayerPanelProps {
  /**
   * Ordered layers, **top-down** (index 0 renders as the first row and
   * represents the top-most layer in Photoshop terms).
   */
  layers: Layer[]
  /** Called with the full reordered list after a drag completes. */
  onReorder: (next: Layer[]) => void
  /** Called when the eye icon is clicked. */
  onVisibilityToggle: (id: string) => void
  /** Called when the lock icon is clicked. */
  onLockToggle: (id: string) => void
  /** Called when a row is clicked (single click, anywhere in the row body). */
  onSelect: (id: string) => void
  /** Called when an inline rename commits with a non-empty trimmed value. */
  onRename: (id: string, name: string) => void
  /**
   * Currently active layer id — drives `aria-selected` and a "selected"
   * highlight on the row. Optional; when omitted no row is highlighted.
   */
  activeId?: string
  /** Optional extra classes appended to the panel root. */
  className?: string
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
 * @param props - {@link LayerPanelProps}.
 * @returns The layer panel element.
 */
export function LayerPanel(props: LayerPanelProps) {
  const {
    layers,
    onReorder,
    onVisibilityToggle,
    onLockToggle,
    onSelect,
    onRename,
    activeId,
    className,
  } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingValueRef = useRef<string>('')
  const dragStartIndexRef = useRef<number | null>(null)

  /**
   * Capture the initial pointer position + index when a drag handle row
   * begins a pointer-down sequence. We don't actually start the visual
   * drag until the pointer moves — that lets a plain click still
   * register as a "select" without flickering into drag mode.
   *
   * @param index - Index of the row receiving the pointer-down.
   * @param id - Id of the layer in that row.
   * @param event - The originating pointer event.
   */
  function onRowPointerDown(index: number, id: string, event: PointerEvent<HTMLLIElement>) {
    if (event.button !== 0) return
    const layer = layers[index]
    if (!layer || layer.locked) return
    dragStartIndexRef.current = index
    setDraggingId(id)
    setOverIndex(index)
    ;(event.currentTarget as HTMLLIElement).setPointerCapture(event.pointerId)
  }

  /**
   * Track which row the pointer is currently over while a drag is in
   * flight. We compute the target index from the row element under the
   * pointer (looked up via `data-mol-id`) so this works inside scrollable
   * containers.
   *
   * @param event - The pointer-move event.
   */
  function onRowPointerMove(event: PointerEvent<HTMLLIElement>) {
    if (draggingId === null) return
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
  function endDrag() {
    if (draggingId !== null && dragStartIndexRef.current !== null && overIndex !== null) {
      const next = moveLayer(layers, dragStartIndexRef.current, overIndex)
      if (next !== layers) onReorder(next)
    }
    dragStartIndexRef.current = null
    setDraggingId(null)
    setOverIndex(null)
  }

  /**
   * Begin inline rename of the given layer. No-op when the layer is
   * locked.
   *
   * @param layer - The layer to rename.
   */
  function startRename(layer: Layer) {
    if (layer.locked) return
    editingValueRef.current = layer.name
    setEditingId(layer.id)
  }

  /**
   * Commit the in-flight rename if the trimmed value is non-empty and
   * differs from the original; either way clear the editing state.
   *
   * @param layer - The layer whose rename is being committed.
   */
  function commitRename(layer: Layer) {
    const next = editingValueRef.current.trim()
    if (next.length > 0 && next !== layer.name) {
      onRename(layer.id, next)
    }
    setEditingId(null)
  }

  /** Cancel an inline rename without persisting. */
  function cancelRename() {
    setEditingId(null)
  }

  /**
   * Convert keyboard input on the rename `<input>` to commit (Enter) or
   * cancel (Escape) intents.
   *
   * @param event - The keyboard event.
   * @param layer - The layer being renamed.
   */
  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>, layer: Layer) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename(layer)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelRename()
    }
  }

  // Auto-focus the rename input when editing starts.
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (editingId !== null && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [editingId])

  return (
    <ul
      className={cm.cn(cm.stack(0 as const), className)}
      role="listbox"
      aria-label={t('layerPanel.label', {}, { defaultValue: 'Layers' })}
      data-mol-id="layer-panel"
    >
      {layers.map((layer, index) => {
        const isActive = layer.id === activeId
        const isDragging = layer.id === draggingId
        const isOver = overIndex === index && draggingId !== null && draggingId !== layer.id
        const isEditing = editingId === layer.id
        const opacityLabel = formatOpacityPercent(layer.opacity)
        const visibilityLabel = layer.visible
          ? t('layerPanel.hide', {}, { defaultValue: 'Hide layer' })
          : t('layerPanel.show', {}, { defaultValue: 'Show layer' })
        const lockLabel = layer.locked
          ? t('layerPanel.unlock', {}, { defaultValue: 'Unlock layer' })
          : t('layerPanel.lock', {}, { defaultValue: 'Lock layer' })

        return (
          <li
            key={layer.id}
            data-mol-id={`layer-panel-row-${layer.id}`}
            data-layer-index={index}
            role="option"
            aria-selected={isActive}
            onPointerDown={(e) => onRowPointerDown(index, layer.id, e)}
            onPointerMove={onRowPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={() => {
              if (draggingId === null && !isEditing) onSelect(layer.id)
            }}
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.cursorPointer)}
            style={{
              opacity: isDragging ? 0.4 : layer.visible ? 1 : 0.55,
              borderTop: isOver ? '2px solid currentColor' : undefined,
              padding: '4px 8px',
              outline: isActive ? '2px solid currentColor' : undefined,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onVisibilityToggle(layer.id)
              }}
              aria-label={visibilityLabel}
              title={visibilityLabel}
              aria-pressed={!layer.visible}
              data-mol-id={`layer-panel-visibility-${layer.id}`}
              className={cm.cursorPointer}
              style={{ background: 'transparent', border: 'none', padding: 0 }}
            >
              <span aria-hidden="true">{layer.visible ? '\u{1F441}' : '\u{1F441}\u{0338}'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onLockToggle(layer.id)
              }}
              aria-label={lockLabel}
              title={lockLabel}
              aria-pressed={layer.locked}
              data-mol-id={`layer-panel-lock-${layer.id}`}
              className={cm.cursorPointer}
              style={{ background: 'transparent', border: 'none', padding: 0 }}
            >
              <span aria-hidden="true">{layer.locked ? '\u{1F512}' : '\u{1F513}'}</span>
            </button>

            {layer.thumbnail && (
              <img
                src={layer.thumbnail}
                alt=""
                aria-hidden="true"
                style={{ width: 24, height: 24, objectFit: 'cover', flexShrink: 0 }}
              />
            )}

            <div
              className={cm.flex1}
              onDoubleClick={(e) => {
                e.stopPropagation()
                startRename(layer)
              }}
            >
              {isEditing ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  defaultValue={layer.name}
                  onChange={(e) => {
                    editingValueRef.current = e.currentTarget.value
                  }}
                  onBlur={() => commitRename(layer)}
                  onKeyDown={(e) => onRenameKeyDown(e, layer)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={t('layerPanel.renameInput', {}, { defaultValue: 'Rename layer' })}
                  data-mol-id={`layer-panel-rename-${layer.id}`}
                  style={{ width: '100%' }}
                />
              ) : (
                <span data-mol-id={`layer-panel-name-${layer.id}`}>{layer.name}</span>
              )}
            </div>

            {(layer.blendMode || opacityLabel) && (
              <span
                aria-label={t('layerPanel.metadata', {}, { defaultValue: 'Layer metadata' })}
                data-mol-id={`layer-panel-meta-${layer.id}`}
                style={{ fontSize: '0.75em', opacity: 0.7 }}
              >
                {layer.blendMode ? layer.blendMode : ''}
                {layer.blendMode && opacityLabel ? ' · ' : ''}
                {opacityLabel}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

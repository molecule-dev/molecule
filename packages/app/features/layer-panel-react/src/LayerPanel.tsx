import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'

import type { DragEndEvent } from '@molecule/app-drag-drop'
import { useScopedDragDrop } from '@molecule/app-drag-drop/react'
import { useTranslation } from '@molecule/app-react'
import { type ElementHandle, getClassMap, type KitKeyboardEvent } from '@molecule/app-ui'
import { Box, Image, Pressable, Text, TextField } from '@molecule/app-ui-react/elements'

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
   * Currently active layer id — drives the row's "selected" highlight and
   * `aria-current="true"` on its select (layer-name) button. Optional; when
   * omitted no row is highlighted.
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
 * Scoped drag-to-reorder follows the row on web and on touch surfaces.
 * The visual convention is top-down — index 0 is the front-most layer.
 *
 * @param props - {@link LayerPanelProps}.
 * @returns The layer panel element.
 */
export function LayerPanel(props: LayerPanelProps): JSX.Element {
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
  const { Scope, Target } = useScopedDragDrop()

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string>()
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingValueRef = useRef<string>('')

  /** Moves a current, unlocked source to the destination in the current stack. */
  function move(from: number, to: number): void {
    if (!layers[from] || layers[from].locked || !layers[to] || from === to) return
    onReorder(moveLayer(layers, from, to))
  }

  /** Clears drag feedback and applies an input completion against the latest layers. */
  function endDrag({ id, overId, reason }: DragEndEvent): void {
    setDraggingId(null)
    setOverId(undefined)
    if (reason === 'unmount' || overId === undefined) return
    move(
      layers.findIndex((layer) => layer.id === id),
      layers.findIndex((layer) => layer.id === overId),
    )
  }

  /**
   * Begin inline rename of the given layer. No-op when the layer is
   * locked.
   *
   * @param layer - The layer to rename.
   */
  function startRename(layer: Layer): void {
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
  function commitRename(layer: Layer): void {
    const next = editingValueRef.current.trim()
    if (next.length > 0 && next !== layer.name) {
      onRename(layer.id, next)
    }
    setEditingId(null)
  }

  /** Cancel an inline rename without persisting. */
  function cancelRename(): void {
    setEditingId(null)
  }

  /**
   * Convert keyboard input on the rename `<input>` to commit (Enter) or
   * cancel (Escape) intents.
   *
   * @param event - The keyboard event.
   * @param layer - The layer being renamed.
   */
  function onRenameKeyDown(event: KitKeyboardEvent, layer: Layer): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename(layer)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelRename()
    }
  }

  // Auto-focus the rename input when editing starts.
  const renameInputRef = useRef<ElementHandle>(null)
  useEffect(() => {
    if (editingId !== null) renameInputRef.current?.focus()
  }, [editingId])

  const renameLabel = t('layerPanel.renameInput', {}, { defaultValue: 'Rename layer' })
  return (
    <Scope
      onDragStart={({ id }) => setDraggingId(id)}
      onDragMove={({ overId }) => setOverId(overId)}
      onDragEnd={endDrag}
    >
      <Box
        as="ul"
        className={cm.cn(cm.stack(0 as const), className)}
        aria-label={t('layerPanel.label', {}, { defaultValue: 'Layers' })}
        data-mol-id="layer-panel"
      >
        {layers.map((layer, index) => {
          const isActive = layer.id === activeId
          const isDragging = layer.id === draggingId
          const isOver = overId === layer.id && draggingId !== null && draggingId !== layer.id
          const isEditing = editingId === layer.id
          const opacityLabel = formatOpacityPercent(layer.opacity)
          const visibilityLabel = layer.visible
            ? t('layerPanel.hide', {}, { defaultValue: 'Hide layer' })
            : t('layerPanel.show', {}, { defaultValue: 'Show layer' })
          const lockLabel = layer.locked
            ? t('layerPanel.unlock', {}, { defaultValue: 'Unlock layer' })
            : t('layerPanel.lock', {}, { defaultValue: 'Lock layer' })
          const rename = layer.locked
            ? undefined
            : { label: renameLabel, run: () => startRename(layer) }

          return (
            <Target
              key={layer.id}
              id={layer.id}
              source={{
                disabled: layer.locked,
                controls: layer.locked
                  ? undefined
                  : {
                      id: `layer-panel-move-${layer.id}`,
                      label: t(
                        'ui.dragDrop.moveItem',
                        { item: layer.name },
                        { defaultValue: 'Move {{item}}' },
                      ),
                      cancelLabel: t('ui.dragDrop.cancelMove', {}, { defaultValue: 'Cancel move' }),
                      choices: layers.flatMap((target, destination) =>
                        target === layer
                          ? []
                          : [
                              {
                                targetId: target.id,
                                label: t(
                                  'ui.dragDrop.moveToPosition',
                                  { position: destination + 1 },
                                  { defaultValue: 'Move to position {{position}}' },
                                ),
                              },
                            ],
                      ),
                    },
              }}
            >
              {(host) => (
                <Box
                  as="li"
                  {...host}
                  data-mol-id={`layer-panel-row-${layer.id}`}
                  data-layer-index={index}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.cursorPointer)}
                  webStyle={{
                    opacity: isDragging ? 0.4 : layer.visible ? 1 : 0.55,
                    borderTop: isOver ? '2px solid currentColor' : undefined,
                    padding: '4px 8px',
                    outline: isActive ? '2px solid currentColor' : undefined,
                  }}
                >
                  <Pressable
                    as="button"
                    type="button"
                    onClick={() => onVisibilityToggle(layer.id)}
                    aria-label={visibilityLabel}
                    title={visibilityLabel}
                    aria-pressed={!layer.visible}
                    data-mol-id={`layer-panel-visibility-${layer.id}`}
                    /* mol-bespoke-button: icon-only visibility toggle in a layer
                 row — a bare glyph with no button surface, so the inline
                 background/border/padding are native resets. 44px touch
                 floor from the ClassMap. */
                    className={cm.cn(cm.cursorPointer, cm.touchTarget)}
                    webStyle={{ background: 'transparent', border: 'none', padding: 0 }}
                  >
                    <Text as="span" aria-hidden="true">
                      {layer.visible ? '\u{1F441}' : '\u{1F441}\u{0338}'}
                    </Text>
                  </Pressable>

                  <Pressable
                    as="button"
                    type="button"
                    onClick={() => onLockToggle(layer.id)}
                    aria-label={lockLabel}
                    title={lockLabel}
                    aria-pressed={layer.locked}
                    data-mol-id={`layer-panel-lock-${layer.id}`}
                    /* mol-bespoke-button: icon-only lock toggle — same bare-glyph
                 row chrome as the visibility toggle above. */
                    className={cm.cn(cm.cursorPointer, cm.touchTarget)}
                    webStyle={{ background: 'transparent', border: 'none', padding: 0 }}
                  >
                    <Text as="span" aria-hidden="true">
                      {layer.locked ? '\u{1F512}' : '\u{1F513}'}
                    </Text>
                  </Pressable>

                  {layer.thumbnail && (
                    <Image
                      src={layer.thumbnail}
                      alt=""
                      aria-hidden="true"
                      webStyle={{ width: 24, height: 24, objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}

                  <Box
                    as="div"
                    className={cm.flex1}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      startRename(layer)
                    }}
                  >
                    {isEditing ? (
                      <TextField
                        as="input"
                        ref={renameInputRef}
                        type="text"
                        defaultValue={layer.name}
                        onValueChange={(value) => {
                          editingValueRef.current = value
                        }}
                        onBlur={() => commitRename(layer)}
                        onKeyDown={(e) => onRenameKeyDown(e, layer)}
                        selectTextOnFocus
                        aria-label={renameLabel}
                        data-mol-id={`layer-panel-rename-${layer.id}`}
                        webStyle={{ width: '100%' }}
                      />
                    ) : (
                      <Pressable
                        as="button"
                        type="button"
                        onClick={() => onSelect(layer.id)}
                        onDoubleClick={rename ? (event) => event.stopPropagation() : undefined}
                        secondaryAction={rename}
                        onKeyDown={(event) => {
                          if (layer.locked || !event.altKey) return
                          const step =
                            event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
                          if (!step) return
                          event.preventDefault()
                          move(index, index + step)
                        }}
                        aria-current={isActive ? 'true' : undefined}
                        data-mol-id={`layer-panel-name-${layer.id}`}
                        /* mol-bespoke-button: the layer NAME is the row's select
                     control — a native button carrying plain text, so the
                     inline background/border/padding/font/color are native
                     resets, not a missing `cm.button()` surface. Native
                     Enter/Space activation gives keyboard users the same
                     select the row click gave mouse users. */
                        className={cm.cn(cm.cursorPointer)}
                        webStyle={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          font: 'inherit',
                          color: 'inherit',
                          textAlign: 'left',
                        }}
                      >
                        {layer.name}
                      </Pressable>
                    )}
                  </Box>

                  {(layer.blendMode || opacityLabel) && (
                    <Text
                      as="span"
                      aria-label={t('layerPanel.metadata', {}, { defaultValue: 'Layer metadata' })}
                      data-mol-id={`layer-panel-meta-${layer.id}`}
                      webStyle={{ fontSize: '0.75em', opacity: 0.7 }}
                    >
                      {layer.blendMode ? layer.blendMode : ''}
                      {layer.blendMode && opacityLabel ? ' · ' : ''}
                      {opacityLabel}
                    </Text>
                  )}
                </Box>
              )}
            </Target>
          )
        })}
      </Box>
    </Scope>
  )
}

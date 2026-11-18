/**
 * Vue layer panel: a Photoshop / Figma–style reorderable layer stack,
 * rendered with `h()` so the component stays a plain `.ts` module.
 *
 * Vue counterpart of `@molecule/app-layer-panel-react`'s `LayerPanel` — the
 * same props (React names), the same ClassMap tokens and the same DOM for the
 * same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  nextTick,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { Layer, LayerPanelProps } from './types.js'
import { formatOpacityPercent, moveLayer } from './utilities.js'

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
 * @param props - Component props (see {@link LayerPanelProps}).
 * @returns The layer panel component.
 */
export const LayerPanel = defineComponent({
  name: 'LayerPanel',
  props: {
    layers: { type: Array as PropType<Layer[]>, required: true },
    onReorder: {
      type: Function as PropType<LayerPanelProps['onReorder']>,
      required: true,
    },
    onVisibilityToggle: {
      type: Function as PropType<LayerPanelProps['onVisibilityToggle']>,
      required: true,
    },
    onLockToggle: {
      type: Function as PropType<LayerPanelProps['onLockToggle']>,
      required: true,
    },
    onSelect: {
      type: Function as PropType<LayerPanelProps['onSelect']>,
      required: true,
    },
    onRename: {
      type: Function as PropType<LayerPanelProps['onRename']>,
      required: true,
    },
    activeId: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /** The layer being dragged, or null. */
    const draggingId = ref<string | null>(null)
    /** The row index the drag is over, or null. */
    const overIndex = ref<number | null>(null)
    /** The layer whose rename field is open, or null. */
    const editingId = ref<string | null>(null)
    /** The rename field's current text (React's `editingValueRef`). */
    let editingValue = ''
    /** The index a drag started from. */
    let dragStartIndex: number | null = null
    /** The open rename field, focused once each time editing starts. */
    let renameInput: HTMLInputElement | null = null

    // React's `useEffect(() => { … focus(); select() }, [editingId])`.
    watch(editingId, async (id) => {
      if (id === null) return
      await nextTick()
      if (renameInput) {
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
     * @param id - Id of the layer in that row.
     * @param event - The originating pointer event.
     */
    const onRowPointerDown = (index: number, id: string, event: PointerEvent): void => {
      if (event.button !== 0) return
      const layer = props.layers[index]
      if (!layer || layer.locked) return
      dragStartIndex = index
      draggingId.value = id
      overIndex.value = index
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
      if (draggingId.value === null) return
      const target = document.elementFromPoint(event.clientX, event.clientY)
      if (!target) return
      const row = target.closest('[data-mol-id^="layer-panel-row-"]') as HTMLElement | null
      if (!row) return
      const idx = Number(row.dataset.layerIndex)
      if (Number.isFinite(idx)) overIndex.value = idx
    }

    /**
     * Commit the drag — call `onReorder` with the new array if the
     * destination differs from the source — and reset all transient drag
     * state.
     */
    const endDrag = (): void => {
      if (draggingId.value !== null && dragStartIndex !== null && overIndex.value !== null) {
        const next = moveLayer(props.layers, dragStartIndex, overIndex.value)
        if (next !== props.layers) props.onReorder(next)
      }
      dragStartIndex = null
      draggingId.value = null
      overIndex.value = null
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
      editingId.value = layer.id
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
      editingId.value = null
    }

    /** Cancel an inline rename without persisting. */
    const cancelRename = (): void => {
      editingId.value = null
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
     * @returns The style object.
     */
    const rowStyle = (layer: Layer, index: number): Record<string, string | number | undefined> => {
      const isDragging = layer.id === draggingId.value
      const isOver =
        overIndex.value === index && draggingId.value !== null && draggingId.value !== layer.id
      return {
        opacity: isDragging ? 0.4 : layer.visible ? 1 : 0.55,
        borderTop: isOver ? '2px solid currentColor' : undefined,
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

    return (): VNode => {
      const rows = props.layers.map((layer, index) => {
        const isActive = layer.id === props.activeId
        const isEditing = editingId.value === layer.id
        const opacityLabel = formatOpacityPercent(layer.opacity)
        const visibilityLabel = layer.visible
          ? t('layerPanel.hide', {}, { defaultValue: 'Hide layer' })
          : t('layerPanel.show', {}, { defaultValue: 'Show layer' })
        const lockLabel = layer.locked
          ? t('layerPanel.unlock', {}, { defaultValue: 'Unlock layer' })
          : t('layerPanel.lock', {}, { defaultValue: 'Lock layer' })

        const children: VNodeChild[] = [
          h(
            'button',
            {
              type: 'button',
              onClick: () => props.onVisibilityToggle(layer.id),
              'aria-label': visibilityLabel,
              title: visibilityLabel,
              'aria-pressed': !layer.visible,
              'data-mol-id': `layer-panel-visibility-${layer.id}`,
              class: cm.cn(cm.cursorPointer, cm.touchTarget),
              style: { background: 'transparent', border: 'none', padding: '0' },
            },
            [
              h(
                'span',
                { 'aria-hidden': 'true' },
                layer.visible ? '\u{1F441}' : '\u{1F441}\u{0338}',
              ),
            ],
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: () => props.onLockToggle(layer.id),
              'aria-label': lockLabel,
              title: lockLabel,
              'aria-pressed': layer.locked,
              'data-mol-id': `layer-panel-lock-${layer.id}`,
              class: cm.cn(cm.cursorPointer, cm.touchTarget),
              style: { background: 'transparent', border: 'none', padding: '0' },
            },
            [h('span', { 'aria-hidden': 'true' }, layer.locked ? '\u{1F512}' : '\u{1F513}')],
          ),
        ]

        if (layer.thumbnail) {
          children.push(
            h('img', {
              src: layer.thumbnail,
              alt: '',
              'aria-hidden': 'true',
              style: { width: '24px', height: '24px', objectFit: 'cover', flexShrink: '0' },
            }),
          )
        }

        children.push(
          h(
            'div',
            {
              class: cm.flex1,
              onDblclick: (event: MouseEvent) => {
                event.stopPropagation()
                startRename(layer)
              },
            },
            isEditing
              ? [
                  h('input', {
                    type: 'text',
                    // React's `defaultValue`: the value attribute, which a
                    // typed value does not overwrite.
                    defaultValue: layer.name,
                    onInput: (event: Event) => {
                      editingValue = (event.target as HTMLInputElement).value
                    },
                    // React's `onBlur` listens to `focusout` (blur does not
                    // bubble), so the commit rides the same event here.
                    onFocusout: () => commitRename(layer),
                    onKeydown: (event: KeyboardEvent) => onRenameKeyDown(event, layer),
                    onPointerdown: (event: PointerEvent) => event.stopPropagation(),
                    'aria-label': t('layerPanel.renameInput', {}, { defaultValue: 'Rename layer' }),
                    'data-mol-id': `layer-panel-rename-${layer.id}`,
                    style: { width: '100%' },
                    ref: (el: unknown) => {
                      renameInput = (el as HTMLInputElement | null) ?? null
                    },
                  }),
                ]
              : [
                  h(
                    'button',
                    {
                      type: 'button',
                      onClick: () => props.onSelect(layer.id),
                      'aria-current': isActive ? 'true' : undefined,
                      'data-mol-id': `layer-panel-name-${layer.id}`,
                      class: cm.cn(cm.cursorPointer),
                      style: {
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '0',
                        font: 'inherit',
                        color: 'inherit',
                        textAlign: 'left',
                      },
                    },
                    layer.name,
                  ),
                ],
          ),
        )

        if (layer.blendMode || opacityLabel) {
          children.push(
            h(
              'span',
              {
                'aria-label': t('layerPanel.metadata', {}, { defaultValue: 'Layer metadata' }),
                'data-mol-id': `layer-panel-meta-${layer.id}`,
                style: { fontSize: '0.75em', opacity: 0.7 },
              },
              metaText(layer, opacityLabel),
            ),
          )
        }

        return h(
          'li',
          {
            key: layer.id,
            'data-mol-id': `layer-panel-row-${layer.id}`,
            'data-layer-index': index,
            onPointerdown: (event: PointerEvent) => onRowPointerDown(index, layer.id, event),
            onPointermove: (event: PointerEvent) => onRowPointerMove(event),
            onPointerup: endDrag,
            onPointercancel: endDrag,
            class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.cursorPointer),
            style: rowStyle(layer, index),
          },
          children,
        )
      })

      return h(
        'ul',
        {
          class: cm.cn(cm.stack(0 as const), props.className),
          'aria-label': t('layerPanel.label', {}, { defaultValue: 'Layers' }),
          'data-mol-id': 'layer-panel',
        },
        rows,
      )
    }
  },
})

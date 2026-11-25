<!--
  LayerPanel: the Svelte counterpart of `@molecule/app-layer-panel-react`'s
  `LayerPanel` — a Photoshop / Figma–style reorderable layer stack with the
  same props (React names), the same ClassMap tokens and the same DOM for the
  same input. Drag-to-reorder uses pointer events; the eye / lock toggles and
  the double-click inline rename emit intent callbacks, and the host owns the
  layer data.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { type CSSStyle as InlineStyle, reactStyle } from '@molecule/app-ui-svelte'

  import { defaultInputValue } from './dom.js'
  import type { Layer, LayerPanelProps } from './types.js'
  import { formatOpacityPercent, moveLayer } from './utilities.js'

  let {
    layers,
    onReorder,
    onVisibilityToggle,
    onLockToggle,
    onSelect,
    onRename,
    activeId,
    className,
  }: LayerPanelProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** The layer being dragged, or null. */
  let draggingId = $state<string | null>(null)
  /** The row index the drag is over, or null. */
  let overIndex = $state<number | null>(null)
  /** The layer whose rename field is open, or null. */
  let editingId = $state<string | null>(null)
  /** The rename field's current text (React's `editingValueRef`). */
  let editingValue = ''
  /** The index a drag started from. */
  let dragStartIndex: number | null = null
  /** The open rename field, focused once each time editing starts. */
  let renameInput = $state<HTMLInputElement | null>(null)

  // React's `useEffect(() => { … focus(); select() }, [editingId])`.
  $effect(() => {
    if (editingId !== null && renameInput) {
      renameInput.focus()
      renameInput.select()
    }
  })

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
  function onRowPointerDown(index: number, layer: Layer, event: PointerEvent): void {
    if (event.button !== 0) return
    if (layer.locked) return
    dragStartIndex = index
    draggingId = layer.id
    overIndex = index
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId)
  }

  /**
   * Track which row the pointer is currently over while a drag is in flight.
   * We compute the target index from the row element under the pointer
   * (looked up via `data-mol-id`) so this works inside scrollable containers.
   *
   * @param event - The pointer-move event.
   */
  function onRowPointerMove(event: PointerEvent): void {
    if (draggingId === null) return
    const target = document.elementFromPoint(event.clientX, event.clientY)
    if (!target) return
    const row = target.closest('[data-mol-id^="layer-panel-row-"]') as HTMLElement | null
    if (!row) return
    const idx = Number(row.dataset.layerIndex)
    if (Number.isFinite(idx)) overIndex = idx
  }

  /**
   * Commit the drag — call `onReorder` with the new array if the destination
   * differs from the source — and reset all transient drag state.
   */
  function endDrag(): void {
    if (draggingId !== null && dragStartIndex !== null && overIndex !== null) {
      const next = moveLayer(layers, dragStartIndex, overIndex)
      if (next !== layers) onReorder(next)
    }
    dragStartIndex = null
    draggingId = null
    overIndex = null
  }

  /**
   * Begin inline rename of the given layer. No-op when the layer is locked.
   *
   * @param layer - The layer to rename.
   */
  function startRename(layer: Layer): void {
    if (layer.locked) return
    editingValue = layer.name
    editingId = layer.id
  }

  /**
   * Commit the in-flight rename if the trimmed value is non-empty and differs
   * from the original; either way clear the editing state.
   *
   * @param layer - The layer whose rename is being committed.
   */
  function commitRename(layer: Layer): void {
    const next = editingValue.trim()
    if (next.length > 0 && next !== layer.name) {
      onRename(layer.id, next)
    }
    editingId = null
  }

  /** Cancel an inline rename without persisting. */
  function cancelRename(): void {
    editingId = null
  }

  /**
   * Convert keyboard input on the rename `<input>` to commit (Enter) or
   * cancel (Escape) intents.
   *
   * @param event - The keyboard event.
   * @param layer - The layer being renamed.
   */
  function onRenameKeyDown(event: KeyboardEvent, layer: Layer): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename(layer)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelRename()
    }
  }

  /** The icon-only toggle's style: React's inline reset for a bare glyph button. */
  const TOGGLE_STYLE: InlineStyle = { background: 'transparent', border: 'none', padding: '0' }

  /** The layer-name button's style: React's native reset for a text-only button. */
  const NAME_STYLE: InlineStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '0',
    font: 'inherit',
    color: 'inherit',
    'text-align': 'left',
  }

  /** The thumbnail's style. */
  const THUMB_STYLE: InlineStyle = {
    width: '24px',
    height: '24px',
    'object-fit': 'cover',
    'flex-shrink': '0',
  }

  /** The rename field's style. */
  const INPUT_STYLE: InlineStyle = { width: '100%' }

  /** The metadata badge's style. */
  const META_STYLE: InlineStyle = { 'font-size': '0.75em', opacity: '0.7' }

  /**
   * The row's inline style, matching React's style object for the same drag /
   * visibility / active state.
   *
   * @param layer - The layer in this row.
   * @param index - The row's index.
   * @returns The style map.
   */
  function rowStyle(layer: Layer, index: number): InlineStyle {
    const isDragging = layer.id === draggingId
    const isOver = overIndex === index && draggingId !== null && draggingId !== layer.id
    return {
      opacity: isDragging ? 0.4 : layer.visible ? 1 : 0.55,
      'border-top': isOver ? '2px solid currentColor' : undefined,
      padding: '4px 8px',
      outline: layer.id === activeId ? '2px solid currentColor' : undefined,
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
</script>

<ul
  class={cm.cn(cm.stack(0 as const), className)}
  aria-label={t('layerPanel.label', {}, { defaultValue: 'Layers' })}
  data-mol-id="layer-panel"
>
  {#each layers as layer, index (layer.id)}
    {@const isActive = layer.id === activeId}
    {@const isEditing = editingId === layer.id}
    {@const opacityLabel = formatOpacityPercent(layer.opacity)}
    {@const visibilityLabel = layer.visible
      ? t('layerPanel.hide', {}, { defaultValue: 'Hide layer' })
      : t('layerPanel.show', {}, { defaultValue: 'Show layer' })}
    {@const lockLabel = layer.locked
      ? t('layerPanel.unlock', {}, { defaultValue: 'Unlock layer' })
      : t('layerPanel.lock', {}, { defaultValue: 'Lock layer' })}
    <li
      data-mol-id={`layer-panel-row-${layer.id}`}
      data-layer-index={index}
      onpointerdown={(event: PointerEvent) => onRowPointerDown(index, layer, event)}
      onpointermove={onRowPointerMove}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.cursorPointer)}
      use:reactStyle={rowStyle(layer, index)}
    >
      <button
        type="button"
        onclick={() => onVisibilityToggle(layer.id)}
        aria-label={visibilityLabel}
        title={visibilityLabel}
        aria-pressed={!layer.visible}
        data-mol-id={`layer-panel-visibility-${layer.id}`}
        class={cm.cn(cm.cursorPointer, cm.touchTarget)}
        use:reactStyle={TOGGLE_STYLE}
      >
        <span aria-hidden="true">{layer.visible ? '\u{1F441}' : '\u{1F441}\u{0338}'}</span>
      </button>

      <button
        type="button"
        onclick={() => onLockToggle(layer.id)}
        aria-label={lockLabel}
        title={lockLabel}
        aria-pressed={layer.locked}
        data-mol-id={`layer-panel-lock-${layer.id}`}
        class={cm.cn(cm.cursorPointer, cm.touchTarget)}
        use:reactStyle={TOGGLE_STYLE}
      >
        <span aria-hidden="true">{layer.locked ? '\u{1F512}' : '\u{1F513}'}</span>
      </button>

      {#if layer.thumbnail}
        <img src={layer.thumbnail} alt="" aria-hidden="true" use:reactStyle={THUMB_STYLE} />
      {/if}

      <!-- No ARIA role: the wrapper is React's plain `<div>`, and adding a role
           would change the DOM React renders (the accessible affordance is the
           native name button inside it). -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class={cm.flex1}
        ondblclick={(event: MouseEvent) => {
          event.stopPropagation()
          startRename(layer)
        }}
      >
        {#if isEditing}
          <input
            bind:this={renameInput}
            type="text"
            use:defaultInputValue={layer.name}
            oninput={(event: Event) => {
              editingValue = (event.currentTarget as HTMLInputElement).value
            }}
            onfocusout={() => commitRename(layer)}
            onkeydown={(event: KeyboardEvent) => onRenameKeyDown(event, layer)}
            onpointerdown={(event: PointerEvent) => event.stopPropagation()}
            aria-label={t('layerPanel.renameInput', {}, { defaultValue: 'Rename layer' })}
            data-mol-id={`layer-panel-rename-${layer.id}`}
            use:reactStyle={INPUT_STYLE}
          />
        {:else}
          <button
            type="button"
            onclick={() => onSelect(layer.id)}
            aria-current={isActive ? 'true' : undefined}
            data-mol-id={`layer-panel-name-${layer.id}`}
            class={cm.cn(cm.cursorPointer)}
            use:reactStyle={NAME_STYLE}
          >
            {layer.name}
          </button>
        {/if}
      </div>

      {#if layer.blendMode || opacityLabel}
        <span
          aria-label={t('layerPanel.metadata', {}, { defaultValue: 'Layer metadata' })}
          data-mol-id={`layer-panel-meta-${layer.id}`}
          use:reactStyle={META_STYLE}
        >
          {metaText(layer, opacityLabel)}
        </span>
      {/if}
    </li>
  {/each}
</ul>

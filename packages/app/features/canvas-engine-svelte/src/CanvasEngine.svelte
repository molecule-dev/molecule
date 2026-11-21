<!--
  CanvasEngine: the Svelte counterpart of
  `@molecule/app-canvas-engine-react`'s `CanvasEngine` — a vector design-tool
  wrapper around the shared `CanvasSurface` (pan/zoom) base. Adds multi-select,
  marquee, alignment, group/ungroup, snap-to-grid and undo/redo. Same props
  (React names), same ClassMap classes, same inline styles, same DOM.

  The component is dual-mode: `document` is treated as controlled when
  `onChange` is supplied, otherwise the initial document seeds internal state.
  `selection` follows the same convention. The imperative handle (`undo`,
  `redo`, `align`, `group`, …) is exported as component methods, so a host
  reaches them with `bind:this`.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import {
    type Bounds,
    CanvasSurface,
    type CanvasViewport,
    screenToCanvas,
  } from '@molecule/app-feature-canvas-svelte'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { alignLayers, distributeLayers } from './alignment.js'
  import { combinedBounds, elementBounds, rectsIntersect, snapToGrid } from './geometry.js'
  import { DEFAULT_HISTORY_LIMIT, HistoryStack } from './history.js'
  import type {
    CanvasAlignment,
    CanvasDistribution,
    CanvasDocument,
    CanvasEngineProps,
    CanvasSelection,
    VectorElement,
    VectorElementId,
    VectorGroup,
  } from './types.js'
  import VectorElementSvg from './VectorElementSvg.svelte'

  let {
    document,
    onChange,
    selection,
    onSelectionChange,
    snapToGrid: snapToGridProp = true,
    gridSize = 8,
    width,
    height,
    showGrid,
    ariaLabel,
    historyLimit = DEFAULT_HISTORY_LIMIT,
    className,
  }: CanvasEngineProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /**
   * Produce a fresh element id, opaque to consumers.
   *
   * @param prefix - The id prefix (`group`).
   * @returns A unique id.
   */
  function nextId(prefix: string): VectorElementId {
    const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
    if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`
    return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
  }

  /**
   * Translate an element by `(dx, dy)` and snap its origin to the grid when
   * `gridSize > 0`. Group children translate uniformly; lines translate both
   * endpoints.
   *
   * @param element - Element to move.
   * @param dx - X-axis displacement in canvas units.
   * @param dy - Y-axis displacement in canvas units.
   * @param step - Grid spacing; `<= 0` disables snapping.
   * @returns The moved element.
   */
  function moveElement(
    element: VectorElement,
    dx: number,
    dy: number,
    step: number,
  ): VectorElement {
    if (element.kind === 'line') {
      const x1 = snapToGrid(element.x1 + dx, step)
      const y1 = snapToGrid(element.y1 + dy, step)
      const offsetX = x1 - element.x1
      const offsetY = y1 - element.y1
      return { ...element, x1, y1, x2: element.x2 + offsetX, y2: element.y2 + offsetY }
    }
    if (element.kind === 'group') {
      const x = snapToGrid(element.x + dx, step)
      const y = snapToGrid(element.y + dy, step)
      const offsetX = x - element.x
      const offsetY = y - element.y
      return {
        ...element,
        x,
        y,
        children: element.children.map((c) => moveElement(c, offsetX, offsetY, 0)),
      }
    }
    return {
      ...element,
      x: snapToGrid(element.x + dx, step),
      y: snapToGrid(element.y + dy, step),
    }
  }

  const docControlled = $derived(onChange != null)
  let internalDoc = $state<CanvasDocument>(untrack(() => document))
  // Keep internal state in sync when `document` changes in uncontrolled mode.
  $effect(() => {
    const next = document
    if (!docControlled) internalDoc = next
  })
  const currentDoc = $derived(docControlled ? document : internalDoc)

  const selectionControlled = $derived(onSelectionChange != null)
  let internalSelection = $state<CanvasSelection>(untrack(() => selection ?? []))
  const currentSelection = $derived(selectionControlled ? (selection ?? []) : internalSelection)

  let viewport = $state<CanvasViewport>({ x: 0, y: 0, zoom: 1 })

  // React's `useRef(new HistoryStack(historyLimit))`: built once, with the
  // limit the component was given at mount.
  const history = untrack(() => new HistoryStack(historyLimit))

  /**
   * Commit a mutated document, recording the previous one first.
   *
   * @param next - The new document.
   * @param recordHistory - Whether to push a history entry (default true).
   */
  function commitDoc(next: CanvasDocument, recordHistory = true): void {
    if (recordHistory) history.push({ document: currentDoc })
    if (docControlled) onChange?.(next)
    else internalDoc = next
  }

  /**
   * Commit a new selection.
   *
   * @param next - The new selection.
   */
  function commitSelection(next: CanvasSelection): void {
    if (selectionControlled) onSelectionChange?.(next)
    else internalSelection = next
  }

  // ---------------------------------------------------------------------
  // Public imperative handle (component methods, reached with `bind:this`)
  // ---------------------------------------------------------------------

  /** Undo the last document mutation. No-op when the stack is empty. */
  export function undo(): void {
    const prev = history.undo({ document: currentDoc })
    if (!prev) return
    if (docControlled) onChange?.(prev.document)
    else internalDoc = prev.document
  }

  /** Redo a previously-undone mutation. No-op when the stack is empty. */
  export function redo(): void {
    const next = history.redo({ document: currentDoc })
    if (!next) return
    if (docControlled) onChange?.(next.document)
    else internalDoc = next.document
  }

  /**
   * Whether there is at least one entry to undo.
   *
   * @returns `true` when `undo` would do something.
   */
  export function canUndo(): boolean {
    return history.canUndo()
  }

  /**
   * Whether there is at least one entry to redo.
   *
   * @returns `true` when `redo` would do something.
   */
  export function canRedo(): boolean {
    return history.canRedo()
  }

  /**
   * Align the selected elements along an edge or axis.
   *
   * @param mode - Alignment mode.
   */
  export function align(mode: CanvasAlignment): void {
    const layers = alignLayers(currentDoc.layers, currentSelection, mode)
    commitDoc({ ...currentDoc, layers })
  }

  /**
   * Distribute three or more selected elements across an axis.
   *
   * @param axis - Distribution axis.
   */
  export function distribute(axis: CanvasDistribution): void {
    const layers = distributeLayers(currentDoc.layers, currentSelection, axis)
    commitDoc({ ...currentDoc, layers })
  }

  /** Wrap the current selection in a new group element. */
  export function group(): void {
    if (currentSelection.length < 2) return
    const selectedLayers = currentDoc.layers.filter((l) => currentSelection.includes(l.id))
    if (selectedLayers.length < 2) return
    const env = combinedBounds(selectedLayers)
    const groupId = nextId('group')
    const groupEl: VectorGroup = {
      id: groupId,
      kind: 'group',
      x: env.x,
      y: env.y,
      width: env.width,
      height: env.height,
      children: selectedLayers,
    }
    // Drop selected layers from top-level, splice the group at the position
    // of the topmost selected layer.
    const remaining = currentDoc.layers.filter((l) => !currentSelection.includes(l.id))
    const topmostIdx = currentDoc.layers.findIndex((l) => currentSelection.includes(l.id))
    const insertAt = Math.max(0, remaining.length - (currentDoc.layers.length - topmostIdx) + 1)
    const layers = [...remaining.slice(0, insertAt), groupEl, ...remaining.slice(insertAt)]
    commitDoc({ ...currentDoc, layers })
    commitSelection([groupId])
  }

  /** Ungroup every selected group element, replacing it with its children. */
  export function ungroup(): void {
    if (currentSelection.length === 0) return
    const layers: VectorElement[] = []
    const newSelection: VectorElementId[] = []
    for (const layer of currentDoc.layers) {
      if (currentSelection.includes(layer.id) && layer.kind === 'group') {
        for (const child of layer.children) {
          layers.push(child)
          newSelection.push(child.id)
        }
      } else {
        layers.push(layer)
        if (currentSelection.includes(layer.id)) newSelection.push(layer.id)
      }
    }
    commitDoc({ ...currentDoc, layers })
    commitSelection(newSelection)
  }

  // ---------------------------------------------------------------------
  // Marquee + click selection
  // ---------------------------------------------------------------------

  // The engine's own root element, for screen-space reference measurements.
  let surfaceEl: HTMLDivElement | undefined
  // Active marquee gesture in canvas-space coordinates.
  let marquee = $state<Bounds | null>(null)
  let marqueeOrigin: { x: number; y: number; pointerId: number } | null = null
  let additive = false
  let baseSelection: CanvasSelection = []

  /**
   * Translate a pointer's client coordinates into canvas space.
   *
   * @param clientX - Viewport x of the pointer.
   * @param clientY - Viewport y of the pointer.
   * @returns The point in canvas space.
   */
  function screenToDocCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = surfaceEl?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return screenToCanvas({ x: clientX - rect.left, y: clientY - rect.top }, viewport)
  }

  /**
   * Starts a marquee gesture on the empty surface.
   *
   * @param e - The pointerdown event.
   */
  function onBackgroundPointerDown(e: PointerEvent): void {
    // Begin a marquee gesture; clear selection unless modifier held.
    const isAdditive = e.shiftKey || e.metaKey || e.ctrlKey
    additive = isAdditive
    baseSelection = isAdditive ? currentSelection.slice() : []
    const start = screenToDocCoords(e.clientX, e.clientY)
    marqueeOrigin = { x: start.x, y: start.y, pointerId: e.pointerId }
    marquee = { x: start.x, y: start.y, width: 0, height: 0 }
    if (!isAdditive) commitSelection([])
  }

  /**
   * Extends the marquee and updates the selection live.
   *
   * @param e - The pointermove event.
   */
  function onSurfacePointerMove(e: PointerEvent): void {
    const origin = marqueeOrigin
    if (!origin || origin.pointerId !== e.pointerId) return
    const cur = screenToDocCoords(e.clientX, e.clientY)
    const x = Math.min(origin.x, cur.x)
    const y = Math.min(origin.y, cur.y)
    const width = Math.abs(cur.x - origin.x)
    const height = Math.abs(cur.y - origin.y)
    const next = { x, y, width, height }
    marquee = next
    // Update selection live during drag.
    const hits = currentDoc.layers
      .filter((l) => rectsIntersect(elementBounds(l), next))
      .map((l) => l.id)
    const merged = additive ? Array.from(new Set([...baseSelection, ...hits])) : hits
    commitSelection(merged)
  }

  /**
   * Ends the marquee gesture.
   *
   * @param e - The pointerup or pointercancel event.
   */
  function onSurfacePointerUp(e: PointerEvent): void {
    const origin = marqueeOrigin
    if (!origin || origin.pointerId !== e.pointerId) return
    marqueeOrigin = null
    marquee = null
  }

  // Drag state for the selection-move gesture.
  let dragState: {
    pointerId: number
    last: { x: number; y: number }
    committed: boolean
  } | null = null

  /**
   * Selects (or toggles) the pressed element and starts a drag gesture.
   *
   * @param e - The pointerdown event.
   * @param id - The element id under the pointer.
   */
  function onElementPointerDown(e: PointerEvent, id: VectorElementId): void {
    e.stopPropagation()
    const isAdditive = e.shiftKey || e.metaKey || e.ctrlKey
    if (isAdditive) {
      const next = currentSelection.includes(id)
        ? currentSelection.filter((s) => s !== id)
        : [...currentSelection, id]
      commitSelection(next)
    } else if (!currentSelection.includes(id)) {
      commitSelection([id])
    }
    // Begin a drag gesture for moving the selection.
    const start = screenToDocCoords(e.clientX, e.clientY)
    dragState = { pointerId: e.pointerId, last: start, committed: false }
    try {
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    } catch (_error) {
      /* jsdom may throw — ignore: pointer capture is best-effort. */
    }
  }

  /**
   * Moves the selected layers by the pointer's delta, snapping to the grid.
   *
   * @param e - The pointermove event.
   */
  function onElementPointerMove(e: PointerEvent): void {
    const state = dragState
    if (!state || state.pointerId !== e.pointerId) return
    const cur = screenToDocCoords(e.clientX, e.clientY)
    const dx = cur.x - state.last.x
    const dy = cur.y - state.last.y
    state.last = cur
    if (dx === 0 && dy === 0) return
    const step = snapToGridProp ? gridSize : 0
    const layers = currentDoc.layers.map((layer) => {
      if (!currentSelection.includes(layer.id)) return layer
      return moveElement(layer, dx, dy, step)
    })
    // Only push history once per drag gesture.
    const recordHistory = !state.committed
    state.committed = true
    commitDoc({ ...currentDoc, layers }, recordHistory)
  }

  /**
   * Ends the element drag gesture.
   *
   * @param e - The pointerup or pointercancel event.
   */
  function onElementPointerUp(e: PointerEvent): void {
    const state = dragState
    if (!state || state.pointerId !== e.pointerId) return
    dragState = null
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch (_error) {
      /* jsdom may throw — ignore: pointer release is best-effort. */
    }
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  const snapEnabled = $derived(snapToGridProp !== false)
  const showGridResolved = $derived(showGrid ?? snapEnabled)
  const surfaceWidth = $derived(width ?? currentDoc.width)
  const surfaceHeight = $derived(height ?? currentDoc.height)
  const resolvedAriaLabel = $derived(
    ariaLabel ?? t('canvasEngine.aria.surface', {}, { defaultValue: 'Vector canvas editor' }),
  )
  // Grid pattern id is unique per instance so multiple engines can coexist
  // without `<defs>` collisions.
  const gridId = `canvas-engine-grid-${nextId('g')}`
  const svgStyle =
    'position: absolute; top: 0px; left: 0px; pointer-events: auto; overflow: visible'
</script>

<div
  bind:this={surfaceEl}
  data-mol-id="canvas-engine"
  data-canvas-engine-snap={snapEnabled ? 'true' : 'false'}
  data-canvas-engine-grid={gridSize}
  class={cm.cn(cm.position('relative'), className)}
  style="position: relative"
>
  <CanvasSurface
    {viewport}
    onViewportChange={(next: CanvasViewport) => {
      viewport = next
    }}
    width={surfaceWidth}
    height={surfaceHeight}
    ariaLabel={resolvedAriaLabel}
    {onBackgroundPointerDown}
  >
    <!-- React's SVG carries these three handlers and no role; adding a role
         would change the DOM every framework must match. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <svg
      data-mol-id="canvas-engine-svg"
      width={currentDoc.width}
      height={currentDoc.height}
      viewBox={`0 0 ${currentDoc.width} ${currentDoc.height}`}
      style={svgStyle}
      onpointermove={(e: PointerEvent) => {
        onSurfacePointerMove(e)
        onElementPointerMove(e)
      }}
      onpointerup={(e: PointerEvent) => {
        onSurfacePointerUp(e)
        onElementPointerUp(e)
      }}
      onpointercancel={(e: PointerEvent) => {
        onSurfacePointerUp(e)
        onElementPointerUp(e)
      }}
    >
      {#if showGridResolved}
        <defs>
          <pattern id={gridId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="currentColor"
              stroke-opacity={0.08}
              stroke-width={1}
            />
          </pattern>
        </defs>
      {/if}
      {#if showGridResolved}
        <rect
          x={0}
          y={0}
          width={currentDoc.width}
          height={currentDoc.height}
          fill={`url(#${gridId})`}
          data-mol-id="canvas-engine-grid"
        />
      {/if}
      {#each currentDoc.layers as layer (layer.id)}
        <!-- React's wrapper <g> carries the pointerdown and no role. -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <g onpointerdown={(e: PointerEvent) => onElementPointerDown(e, layer.id)}>
          <VectorElementSvg element={layer} selected={currentSelection.includes(layer.id)} />
        </g>
      {/each}
      {#if marquee}
        <rect
          data-mol-id="canvas-engine-marquee"
          x={marquee.x}
          y={marquee.y}
          width={marquee.width}
          height={marquee.height}
          fill="currentColor"
          fill-opacity={0.08}
          stroke="currentColor"
          stroke-opacity={0.4}
          stroke-width={1}
          stroke-dasharray="4 2"
          pointer-events="none"
        />
      {/if}
    </svg>
  </CanvasSurface>
</div>

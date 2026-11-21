<!--
  WhiteboardCanvas: the Svelte counterpart of
  `@molecule/app-whiteboard-canvas-react`'s `WhiteboardCanvas` — pen / marker /
  eraser / sticky-note / line / arrow / shape / text tools layered on top of
  `@molecule/app-feature-canvas-svelte`'s `CanvasSurface`. Same props (React
  names), same ClassMap classes, same inline geometry, same DOM.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import {
    CanvasSurface,
    type CanvasViewport,
    screenToCanvas,
  } from '@molecule/app-feature-canvas-svelte'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import {
    buildShapePath,
    buildStrokePath,
    defaultShapeStyle,
    defaultStickyNoteStyle,
    defaultStrokeColor,
    defaultStrokeWidth,
    generateWhiteboardId,
    shapeBounds,
  } from './strokes.js'
  import type {
    WhiteboardCanvasProps,
    WhiteboardShape,
    WhiteboardShapeKind,
    WhiteboardStickyNote,
    WhiteboardStroke,
    WhiteboardStrokeKind,
    WhiteboardTool,
  } from './types.js'

  let {
    strokes,
    shapes,
    stickyNotes,
    onChange,
    tool,
    strokeColor,
    strokeWidth,
    stickyBackground,
    width,
    height,
    initialViewport,
    viewportLimits,
    readOnly,
    ariaLabel,
    className,
  }: WhiteboardCanvasProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /**
   * Narrows a tool to the stroke kinds it draws with.
   *
   * @param tk - The active tool.
   * @returns Whether the tool draws a free-form stroke.
   */
  const isStrokeTool = (tk: WhiteboardTool): tk is WhiteboardStrokeKind =>
    tk === 'pen' || tk === 'marker' || tk === 'eraser'

  /**
   * Narrows a tool to the shape kinds it draws with.
   *
   * @param tk - The active tool.
   * @returns Whether the tool draws a vector shape.
   */
  const isShapeTool = (tk: WhiteboardTool): tk is WhiteboardShapeKind =>
    tk === 'line' || tk === 'arrow' || tk === 'rect' || tk === 'ellipse'

  // React's `useState` seed: the initial viewport is read once, so a later
  // `initialViewport` prop never resets the viewport.
  let viewport = $state<CanvasViewport>(untrack(() => initialViewport ?? { x: 0, y: 0, zoom: 1 }))

  // The tool layer element, for screen-space reference measurements.
  let innerEl: HTMLDivElement | undefined

  // Active in-flight stroke (pen / marker / eraser).
  let activeStroke = $state<WhiteboardStroke | null>(null)
  // Active in-flight shape (line / arrow / rect / ellipse).
  let activeShape = $state<WhiteboardShape | null>(null)
  // Active pointer id, so multi-touch / pen pressure don't cross-fire.
  let activePointerId: number | null = null

  // All committed strokes plus the in-flight stroke for live preview.
  const renderStrokes = $derived(activeStroke ? [...strokes, activeStroke] : strokes)
  const renderShapes = $derived(activeShape ? [...shapes, activeShape] : shapes)

  const resolvedAriaLabel = $derived(
    ariaLabel ?? t('whiteboard.aria.canvas', {}, { defaultValue: 'Whiteboard canvas' }),
  )

  const innerStyle = $derived(
    `position: absolute; inset: 0px; pointer-events: ${tool === 'select' || readOnly ? 'none' : 'auto'}`,
  )

  const svgStyle =
    'position: absolute; top: 0px; left: 0px; overflow: visible; pointer-events: none'

  /**
   * Translate a raw pointer event into canvas-space using the surface's
   * inner layer as the screen-space reference. We intentionally do NOT
   * read transforms via getComputedStyle — the inner layer is rendered
   * at the canvas-space origin, so its bounding rect already accounts
   * for the viewport translate + zoom.
   *
   * @param e - The pointer event.
   * @returns The point in canvas-space.
   */
  function eventToCanvas(e: PointerEvent): { x: number; y: number } {
    const el = innerEl
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    // Use the parent surface (the canvas-surface root) as the
    // screen-space origin; the inner layer's rect is offset/scaled by
    // the current viewport transform, but the surface itself isn't.
    const surfaceEl = el.parentElement ?? el
    const surfaceRect = surfaceEl.getBoundingClientRect()
    const screenPoint = {
      x: e.clientX - surfaceRect.left,
      y: e.clientY - surfaceRect.top,
    }
    // We rely on the surface's data-canvas-* attrs for the most
    // accurate viewport (state may be a tick behind during fast
    // pointer streams).
    const innerZoom = Number(el.dataset.canvasZoom ?? viewport.zoom) || 1
    const innerX = Number(el.dataset.canvasX ?? viewport.x) || 0
    const innerY = Number(el.dataset.canvasY ?? viewport.y) || 0
    // Avoid the unused-rect lint by keeping the rect call above; it
    // also forces a reflow read so jsdom tests get consistent
    // measurements.
    void rect
    return screenToCanvas(screenPoint, { x: innerX, y: innerY, zoom: innerZoom })
  }

  /**
   * Starts a gesture on the tool layer: stroke / shape drafts commit on
   * pointer up; sticky notes commit here.
   *
   * @param e - The pointerdown event.
   */
  function onInnerPointerDown(e: PointerEvent): void {
    if (readOnly) return
    if (tool === 'select') return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    // Block surface pan for our active gesture.
    e.stopPropagation()
    activePointerId = e.pointerId
    try {
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch (_error) {
      /* jsdom can throw — safe to ignore. */
    }
    const point = eventToCanvas(e)

    if (isStrokeTool(tool)) {
      activeStroke = {
        id: generateWhiteboardId(),
        kind: tool,
        points: [point],
        color: strokeColor ?? defaultStrokeColor(tool),
        width: strokeWidth ?? defaultStrokeWidth(tool),
      }
      return
    }

    if (isShapeTool(tool)) {
      const style = defaultShapeStyle(tool)
      activeShape = {
        id: generateWhiteboardId(),
        kind: tool,
        from: point,
        to: point,
        stroke: strokeColor ?? style.stroke,
        strokeWidth: strokeWidth ?? style.strokeWidth,
        fill: style.fill,
      }
      return
    }

    if (tool === 'sticky' || tool === 'text') {
      const sticky = defaultStickyNoteStyle()
      const placeholder = t(
        'whiteboard.stickyNote.placeholder',
        {},
        {
          defaultValue: 'New note',
        },
      )
      const note: WhiteboardStickyNote = {
        id: generateWhiteboardId(),
        position: { x: point.x - sticky.width / 2, y: point.y - sticky.height / 2 },
        width: sticky.width,
        height: sticky.height,
        text: placeholder,
        background: stickyBackground ?? (tool === 'text' ? 'transparent' : sticky.background),
        color: sticky.color,
      }
      onChange({ strokes, shapes, stickyNotes: [...stickyNotes, note] })
      // Sticky notes are committed on tap-down — no drag needed.
      activePointerId = null
    }
  }

  /**
   * Extends the in-flight stroke or shape to the pointer's position.
   *
   * @param e - The pointermove event.
   */
  function onInnerPointerMove(e: PointerEvent): void {
    if (activePointerId !== e.pointerId) return
    const point = eventToCanvas(e)
    if (activeStroke) {
      activeStroke = { ...activeStroke, points: [...activeStroke.points, point] }
      return
    }
    if (activeShape) {
      activeShape = { ...activeShape, to: point }
    }
  }

  /**
   * Commits the in-flight stroke or shape (or discards a zero-size
   * shape) and releases the pointer.
   *
   * @param e - The pointerup or pointercancel event.
   */
  function finishGesture(e: PointerEvent): void {
    if (activePointerId !== e.pointerId) return
    activePointerId = null
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch (_error) {
      /* jsdom — safe to ignore. */
    }
    if (activeStroke) {
      // Commit the stroke even if it's a single tap (1 point) — that
      // represents a dot mark.
      const next = [...strokes, activeStroke]
      activeStroke = null
      onChange({ strokes: next, shapes, stickyNotes })
      return
    }
    if (activeShape) {
      const b = shapeBounds(activeShape)
      // Drop zero-size shapes (a click without drag).
      if (b.width < 1 && b.height < 1) {
        activeShape = null
        return
      }
      const next = [...shapes, activeShape]
      activeShape = null
      onChange({ strokes, shapes: next, stickyNotes })
    }
  }

  /**
   * The inline style of one sticky note.
   *
   * @param note - The sticky note to position.
   * @returns Its CSS text.
   */
  function stickyStyle(note: WhiteboardStickyNote): string {
    return `position: absolute; left: ${note.position.x}px; top: ${note.position.y}px; width: ${note.width}px; height: ${note.height}px; background: ${note.background}; color: ${note.color}; padding: 8px; box-sizing: border-box; white-space: pre-wrap; overflow: hidden; pointer-events: none`
  }
</script>

<CanvasSurface
  {viewport}
  onViewportChange={(next: CanvasViewport) => {
    viewport = next
  }}
  {width}
  {height}
  limits={viewportLimits}
  ariaLabel={resolvedAriaLabel}
  className={cm.cn(cm.surfaceSecondary, className)}
>
  <!-- React's reference tool layer is a plain `<div>` carrying the pointer
       handlers and no role; adding one would change the DOM every framework
       must match. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={innerEl}
    data-mol-id="whiteboard-canvas-tool-layer"
    data-whiteboard-tool={tool}
    style={innerStyle}
    onpointerdown={onInnerPointerDown}
    onpointermove={onInnerPointerMove}
    onpointerup={finishGesture}
    onpointercancel={finishGesture}
  >
    <svg data-mol-id="whiteboard-canvas-svg" {width} {height} style={svgStyle}>
      {#each renderShapes as shape (shape.id)}
        {#if shape.kind === 'rect'}
          {@const b = shapeBounds(shape)}
          <rect
            data-mol-id="whiteboard-canvas-shape"
            data-shape-kind={shape.kind}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            stroke={shape.stroke}
            stroke-width={shape.strokeWidth}
            fill={shape.fill ?? 'none'}
          ></rect>
        {:else if shape.kind === 'ellipse'}
          {@const b = shapeBounds(shape)}
          <ellipse
            data-mol-id="whiteboard-canvas-shape"
            data-shape-kind={shape.kind}
            cx={b.x + b.width / 2}
            cy={b.y + b.height / 2}
            rx={b.width / 2}
            ry={b.height / 2}
            stroke={shape.stroke}
            stroke-width={shape.strokeWidth}
            fill={shape.fill ?? 'none'}
          ></ellipse>
        {:else}
          <path
            data-mol-id="whiteboard-canvas-shape"
            data-shape-kind={shape.kind}
            d={buildShapePath(shape)}
            stroke={shape.stroke}
            stroke-width={shape.strokeWidth}
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
        {/if}
      {/each}
      {#each renderStrokes as stroke (stroke.id)}
        <path
          data-mol-id="whiteboard-canvas-stroke"
          data-stroke-kind={stroke.kind}
          d={buildStrokePath(stroke.points)}
          stroke={stroke.color}
          stroke-width={stroke.width}
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity={stroke.kind === 'eraser' ? 0.4 : 1}
        ></path>
      {/each}
    </svg>
    {#each stickyNotes as note (note.id)}
      <div
        data-mol-id="whiteboard-canvas-sticky"
        class={cm.cn(cm.position('absolute'))}
        style={stickyStyle(note)}
      >
        {note.text}
      </div>
    {/each}
  </div>
</CanvasSurface>

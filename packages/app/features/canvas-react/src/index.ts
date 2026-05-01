/**
 * React canvas primitives — the SHARED BASE for canvas-family wrappers
 * (whiteboard, mind-map, design-canvas, presentation slide-canvas).
 *
 * This package provides only the generic mechanics every canvas variant
 * uses: pan/zoom/select/transform infrastructure, node/edge primitives,
 * pointer-event utilities, and pure coordinate-transform helpers.
 *
 * Domain-specific behavior (whiteboard drawing tools, mind-map auto-
 * layout, design-canvas vector ops) lives in the wrapper packages,
 * which consume this base as a peer dependency.
 *
 * Exports:
 * - `<CanvasSurface>` — pan/zoom container; children render in
 *   canvas-coordinate-space. Wheel zooms around the cursor; primary
 *   drag on the empty surface pans.
 * - `<CanvasNode>` — generic positioned + draggable + resizable
 *   wrapper that lives inside the surface's canvas-space layer.
 * - `<CanvasEdge>` — generic edge between two canvas-space points,
 *   with `'line'`, `'bezier'`, or `'orthogonal'` geometry.
 * - `useCanvasViewport()` — viewport state hook with `panBy` / `zoomBy`
 *   helpers and optional clamping.
 * - `useCanvasSelection()` — selection-set hook with idiomatic toggles.
 * - `screenToCanvas`, `canvasToScreen`, `clampViewport`, `fitToBounds`
 *   — pure coordinate-transform helpers.
 * - `buildEdgePath` — pure SVG path builder used by `<CanvasEdge>`.
 * - `CanvasViewport`, `Point`, `Size`, `Bounds`, `ViewportLimits`,
 *   `CanvasEdgeKind`, `CanvasItemId`, `CanvasDragInfo`,
 *   `CanvasResizeInfo` types.
 *
 * @example
 * ```tsx
 * import {
 *   CanvasSurface,
 *   CanvasNode,
 *   CanvasEdge,
 *   useCanvasViewport,
 *   useCanvasSelection,
 *   type CanvasViewport,
 * } from '@molecule/app-feature-canvas-react'
 *
 * function Demo() {
 *   const { viewport, setViewport } = useCanvasViewport()
 *   const { selected, toggle } = useCanvasSelection()
 *   return (
 *     <CanvasSurface
 *       viewport={viewport}
 *       onViewportChange={setViewport}
 *       width={800}
 *       height={600}
 *     >
 *       <CanvasNode
 *         id="a"
 *         position={{ x: 100, y: 100 }}
 *         size={{ width: 80, height: 40 }}
 *         selected={selected.has('a')}
 *         onSelect={(id) => id && toggle(id)}
 *       />
 *       <CanvasEdge from={{ x: 180, y: 120 }} to={{ x: 280, y: 200 }} kind="bezier" />
 *     </CanvasSurface>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './CanvasEdge.js'
export * from './CanvasNode.js'
export * from './CanvasSurface.js'
export * from './coordinates.js'
export * from './hooks.js'
export * from './types.js'

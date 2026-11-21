/**
 * Solid canvas primitives — the SHARED BASE for canvas-family wrappers
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
 *   CanvasEdge,
 *   CanvasNode,
 *   CanvasSurface,
 *   useCanvasSelection,
 *   useCanvasViewport,
 * } from '@molecule/app-feature-canvas-solid'
 *
 * export function Demo() {
 *   // Read the getters inside the JSX: destructuring a getter takes a snapshot.
 *   const canvas = useCanvasViewport()
 *   const selection = useCanvasSelection()
 *   return (
 *     <CanvasSurface
 *       viewport={canvas.viewport}
 *       onViewportChange={canvas.setViewport}
 *       width={800}
 *       height={600}
 *     >
 *       <CanvasNode
 *         id="a"
 *         position={{ x: 100, y: 100 }}
 *         size={{ width: 80, height: 40 }}
 *         selected={selection.selected.has('a')}
 *         onSelect={(id) => id && selection.toggle(id)}
 *       />
 *       <CanvasEdge from={{ x: 180, y: 120 }} to={{ x: 280, y: 200 }} kind="bezier" />
 *     </CanvasSurface>
 *   )
 * }
 * ```
 *
 * @remarks
 * It is the Solid counterpart of `@molecule/app-feature-canvas-react`: the same
 * exports, the same props (React spelling) and the same DOM for the same
 * input, so an app switches framework by changing only the package name.
 *
 * @module
 */

export * from './CanvasEdge.jsx'
export * from './CanvasNode.jsx'
export * from './CanvasSurface.jsx'
export * from './coordinates.js'
export * from './hooks.js'
export * from './types.js'

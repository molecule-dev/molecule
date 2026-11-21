/**
 * Angular canvas primitives — the SHARED BASE for canvas-family wrappers
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
 * - `<CanvasSurface>` (`div[mol-canvas-surface]`) — pan/zoom container;
 *   projected content renders in canvas-coordinate-space. Wheel zooms
 *   around the cursor; primary drag on the empty surface pans.
 * - `<CanvasNode>` (`div[mol-canvas-node]`) — generic positioned +
 *   draggable + resizable wrapper that lives inside the surface's
 *   canvas-space layer.
 * - `<CanvasEdge>` (`svg[mol-canvas-edge]`) — generic edge between two
 *   canvas-space points, with `'line'`, `'bezier'`, or `'orthogonal'`
 *   geometry.
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
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   CanvasEdge,
 *   CanvasNode,
 *   CanvasSurface,
 *   useCanvasSelection,
 *   useCanvasViewport,
 * } from '@molecule/app-feature-canvas-angular'
 *
 * @Component({
 *   selector: 'app-board',
 *   standalone: true,
 *   imports: [CanvasSurface, CanvasNode, CanvasEdge],
 *   template: `
 *     <div
 *       mol-canvas-surface
 *       [viewport]="canvas.viewport"
 *       [onViewportChange]="canvas.setViewport"
 *       [width]="800"
 *       [height]="600"
 *     >
 *       <div mol-canvas-node id="a" [position]="{ x: 100, y: 100 }" [size]="{ width: 80, height: 40 }" />
 *       <svg mol-canvas-edge [from]="{ x: 180, y: 120 }" [to]="{ x: 280, y: 200 }" kind="bezier"></svg>
 *     </div>
 *   `,
 * })
 * export class Board {
 *   readonly canvas = useCanvasViewport({ initial: { x: 0, y: 0, zoom: 1 } })
 *   readonly selection = useCanvasSelection()
 * }
 * ```
 *
 * @remarks
 * It is the Angular counterpart of `@molecule/app-feature-canvas-react`: the
 * same exports, the same props (React spelling) and the same DOM for the same
 * input, so an app switches framework by changing only the package name. Node
 * props (`children`) are projected content; each component's selector makes its
 * host element React's root element.
 *
 * @module
 */

export * from './canvas-edge.component.js'
export * from './canvas-node.component.js'
export * from './canvas-surface.component.js'
export * from './coordinates.js'
export * from './hooks.js'
export * from './types.js'

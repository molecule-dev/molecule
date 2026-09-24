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
 * import { useState } from 'react'
 *
 * import {
 *   CanvasEdge,
 *   CanvasNode,
 *   CanvasSurface,
 *   useCanvasSelection,
 *   useCanvasViewport,
 * } from '@molecule/app-feature-canvas-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as canvasLocales from '@molecule/app-locales-feature-canvas'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(canvasLocales)
 *
 * const size = { width: 120, height: 48 }
 *
 * export function Board() {
 *   const { viewport, setViewport } = useCanvasViewport()
 *   const { selected, select } = useCanvasSelection()
 *   const [nodes, setNodes] = useState([
 *     { id: 'idea', label: 'Idea', position: { x: 40, y: 40 } },
 *     { id: 'plan', label: 'Plan', position: { x: 280, y: 160 } },
 *   ])
 *   const [a, b] = nodes
 *   return (
 *     <I18nProvider provider={getI18nProvider()}>
 *       <CanvasSurface viewport={viewport} onViewportChange={setViewport} width={800} height={600}>
 *         <CanvasEdge
 *           from={{ x: a.position.x + size.width, y: a.position.y + size.height / 2 }}
 *           to={{ x: b.position.x, y: b.position.y + size.height / 2 }}
 *           kind="bezier"
 *         />
 *         {nodes.map((node) => (
 *           <CanvasNode
 *             key={node.id}
 *             id={node.id}
 *             position={node.position}
 *             size={size}
 *             selected={selected.has(node.id)}
 *             onSelect={(id, e) => id && select([id], e.shiftKey)}
 *             onDrag={({ position }) =>
 *               setNodes((list) => list.map((n) => (n.id === node.id ? { ...n, position } : n)))
 *             }
 *           >
 *             {node.label}
 *           </CanvasNode>
 *         ))}
 *       </CanvasSurface>
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Everything is controlled.** `CanvasSurface` never stores the viewport
 *   (pass `viewport` + `onViewportChange`, e.g. from `useCanvasViewport()`),
 *   and `CanvasNode` never moves itself: `onDrag` reports
 *   `info.position` in canvas units and you must write it back into the
 *   node's `position` prop, or dragging does nothing. `selected` only sets
 *   `data-selected`/`aria-selected` — there is no built-in selection
 *   styling; style it via `className` or children.
 * - `onSelect` fires on a pointer press that did NOT move; a press that
 *   moves is a drag. `CanvasEdge` takes explicit canvas-space points — it
 *   does not follow nodes by id, so recompute `from`/`to` from node state.
 * - The resize handle renders only when BOTH `onResize` and `size` are
 *   passed.
 * - Every component calls `useTranslation()` from `@molecule/app-react`
 *   (throws without an `I18nProvider` / `MoleculeProvider i18n` above it) and
 *   `getClassMap()` (throws until `setClassMap(...)` ran). Aria labels come
 *   from `@molecule/app-locales-feature-canvas`.
 *
 * @module
 */

export * from './CanvasEdge.js'
export * from './CanvasNode.js'
export * from './CanvasSurface.js'
export * from './coordinates.js'
export * from './hooks.js'
export * from './types.js'

/**
 * React whiteboard canvas — pen / marker / eraser / sticky-note /
 * line / arrow / shape / text tools layered on top of
 * `@molecule/app-feature-canvas-react`.
 *
 * Pan + zoom infrastructure is delegated to `<CanvasSurface>` from
 * the base — this package contributes only the whiteboard-specific
 * tools, geometry helpers, and element types (free-form strokes,
 * vector shapes, sticky notes / text boxes).
 *
 * Exports:
 * - `<WhiteboardCanvas>` — controlled canvas component. Accepts
 *   `strokes`, `shapes`, `stickyNotes`, `tool`, and an `onChange`
 *   callback fired at the end of every gesture.
 * - `WhiteboardSnapshot`, `WhiteboardStroke`, `WhiteboardShape`,
 *   `WhiteboardStickyNote`, `WhiteboardTool` types describing the
 *   board's element model.
 * - `buildStrokePath`, `buildShapePath`, `shapeBounds`,
 *   `applyEraserStrokes`, `strokeIntersectsPath`, `segmentsIntersect`,
 *   `defaultStrokeColor`, `defaultStrokeWidth`, `defaultShapeStyle`,
 *   `defaultStickyNoteStyle`, `generateWhiteboardId` — pure
 *   geometry / id helpers (no React, no DOM).
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import {
 *   WhiteboardCanvas,
 *   type WhiteboardShape,
 *   type WhiteboardStickyNote,
 *   type WhiteboardStroke,
 *   type WhiteboardTool,
 * } from '@molecule/app-whiteboard-canvas-react'
 *
 * function Demo() {
 *   const [tool, setTool] = useState<WhiteboardTool>('pen')
 *   const [strokes, setStrokes] = useState<WhiteboardStroke[]>([])
 *   const [shapes, setShapes] = useState<WhiteboardShape[]>([])
 *   const [stickyNotes, setStickyNotes] = useState<WhiteboardStickyNote[]>([])
 *   return (
 *     <WhiteboardCanvas
 *       tool={tool}
 *       strokes={strokes}
 *       shapes={shapes}
 *       stickyNotes={stickyNotes}
 *       onChange={(c) => {
 *         setStrokes(c.strokes)
 *         setShapes(c.shapes)
 *         setStickyNotes(c.stickyNotes)
 *       }}
 *       width={800}
 *       height={600}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * `width` / `height` are REQUIRED CSS-pixel numbers — the surface does not
 * auto-size to its container; measure the container (e.g. a ResizeObserver)
 * for fill layouts. Requires the `@molecule/app-feature-canvas-react` peer
 * (pan/zoom base). Eraser gestures round-trip through `onChange` as
 * strokes; run `applyEraserStrokes` before persisting if you want erasures
 * baked in. UI strings come from the companion
 * `@molecule/app-locales-whiteboard-canvas` bond. `readOnly` disables all
 * drawing tools but keeps background pan.
 *
 * @module
 */

export * from './strokes.js'
export * from './types.js'
export * from './WhiteboardCanvas.js'

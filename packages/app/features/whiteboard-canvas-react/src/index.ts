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
 * @module
 */

export * from './strokes.js'
export * from './types.js'
export * from './WhiteboardCanvas.js'

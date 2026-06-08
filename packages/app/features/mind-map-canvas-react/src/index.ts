/**
 * React mind-map canvas — thin domain wrapper over the shared canvas
 * base. Tree-structured nodes (parent/child links), automatic radial /
 * horizontal / vertical tree layout, fold/unfold subtrees, inline
 * edit-on-double-click, +/- toggles to add and collapse children.
 *
 * Pan / zoom is delegated to `<CanvasSurface>` from
 * `@molecule/app-feature-canvas-react`. This package owns only the
 * mind-map domain semantics — adding mechanics that live above the
 * pan/zoom-and-paint base.
 *
 * Exports:
 * - `<MindMapCanvas>` — top-level widget; controlled or uncontrolled.
 * - `MindMapNode`, `MindMapLayout`, `MindMapLayoutResult` types.
 * - Pure layout helpers: `computeRadialPositions`,
 *   `computeHorizontalTreePositions`, layout knobs + defaults.
 * - Pure tree mutators: `findNode`, `updateNode`, `setNodeText`,
 *   `toggleCollapsed`, `addChild`, `removeNode`.
 *
 * Used by the mind-mapping flagship.
 *
 * @example
 * ```tsx
 * import { MindMapCanvas, type MindMapNode } from '@molecule/app-mind-map-canvas-react'
 *
 * function Demo() {
 *   const [root, setRoot] = useState<MindMapNode>({
 *     id: 'r',
 *     text: 'Project',
 *     children: [
 *       { id: 'a', text: 'Plan', children: [] },
 *       { id: 'b', text: 'Build', children: [] },
 *     ],
 *   })
 *   return <MindMapCanvas root={root} onChange={setRoot} layout="radial" />
 * }
 * ```
 *
 * @module
 */

export * from './layout.js'
export * from './MindMapCanvas.js'
export * from './tree.js'
export * from './types.js'

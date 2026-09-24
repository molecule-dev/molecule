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
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { MindMapCanvas, type MindMapNode } from '@molecule/app-mind-map-canvas-react'
 *
 * export function ProjectMindMap() {
 *   const [root, setRoot] = useState<MindMapNode>({
 *     id: 'r',
 *     text: 'Project',
 *     children: [
 *       { id: 'plan', text: 'Plan', children: [{ id: 'scope', text: 'Scope', children: [] }] },
 *       { id: 'build', text: 'Build', children: [] },
 *     ],
 *   })
 *   // Controlled: every fold / rename / add-child hands back the next tree — persist it here.
 *   return <MindMapCanvas root={root} onChange={setRoot} layout="horizontal" width={960} height={540} />
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond (`setClassMap(...)` at startup) and a
 * React `I18nProvider` ancestor — `getClassMap()` and `useTranslation()`
 * both throw before wiring. Pair with the companion locale bond
 * `@molecule/app-locales-mind-map-canvas` for translated aria labels and
 * the "New idea" default child text (English fallbacks otherwise).
 *
 * The surface is FIXED-SIZE: `width` / `height` are pixel props
 * (default 800x600) — the canvas does not track its parent's size. To
 * fill a panel, measure the parent (e.g. a resize observer) and pass
 * the measured pixels down; CSS alone will clip, not resize.
 *
 * Supplying `onChange` makes the tree fully controlled (every
 * fold / edit / add-child calls it with the next root); you MUST write it
 * back into `root` or nothing visibly changes. Omitting it lets the canvas
 * manage an internal copy seeded from `root` (later `root` changes are then
 * NOT picked up, and edits are lost on unmount).
 *
 * Node `id`s must be unique across the whole tree. Added children get
 * generated ids (`<parentId>-c-<timestamp>-<n>`) and the translated
 * "New idea" text; rename is double-click, Enter commits, Escape cancels.
 * There is no delete button — call `removeNode(root, id)` yourself.
 *
 * @module
 */

export * from './layout.js'
export * from './MindMapCanvas.js'
export * from './tree.js'
export * from './types.js'

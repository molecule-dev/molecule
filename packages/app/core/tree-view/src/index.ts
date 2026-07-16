/**
 * Tree view core interface for molecule.dev.
 *
 * Provides a standardized API for hierarchical tree UI components
 * with support for selection, expansion, drag-and-drop, and checkboxes.
 * Bond a provider (e.g. `@molecule/app-tree-view-default`) to supply
 * the concrete implementation.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-tree-view'
 * import { provider } from '@molecule/app-tree-view-default'
 *
 * setProvider(provider) // once, at startup (bonds.ts)
 *
 * const tree = requireProvider().createTree({
 *   data: [
 *     { id: 'root', label: 'Root', children: [{ id: 'child', label: 'Child' }] },
 *   ],
 *   onSelect: (node) => openNode(node),
 * })
 * tree.expandNode('root')
 * ```
 *
 * @remarks
 * - **The instance is HEADLESS state, not UI.** `createTree` returns tree state
 *   operations (`expandNode`/`selectNode`/`getData`/…) — nothing appears on
 *   screen. The app renders the nodes itself, re-rendering after state calls;
 *   style via `getClassMap()` from `@molecule/app-ui` and run node labels that
 *   are UI text through `t('key', values, { defaultValue })`.
 * - **Wire the bond at startup** — {@link requireProvider} throws until
 *   `setProvider` has been called.
 * - `onDrop` only fires when `draggable: true`; `multiSelect` and
 *   `showCheckboxes` default to `false`.
 * - Call `destroy()` when the owning screen unmounts.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

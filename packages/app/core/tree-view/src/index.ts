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
 * @e2e
 * End-to-end checklist — drive the RENDERED tree in the live preview (real
 * nodes, no mocks), adapt each item to this app's actual tree screen, and check
 * every box off one by one. A box you can't check is an integration bug to fix
 * — not a skip:
 * - [ ] The root-level nodes from `data` render on screen with their labels; a
 *   node with `children` shows an expand/collapse affordance and a leaf does
 *   not. A node with `disabled: true` renders non-interactive — clicking it
 *   neither selects it nor fires `onSelect`.
 * - [ ] Expanding a parent reveals its child rows and collapsing hides them
 *   again, and the expanded STATE is reflected: the re-rendered node shows its
 *   expanded affordance and the node's `expanded` flag in `getData()` matches
 *   what's on screen. `expandAll()`/`collapseAll()` open/close the whole tree;
 *   each toggle fires `onExpand` with the affected node.
 * - [ ] Clicking a node selects it: `onSelect` fires with THAT node (verify its
 *   `id`/`label`), the row is visibly highlighted, and the node appears in
 *   `getSelectedNodes()`.
 * - [ ] Single vs multi matches config: with `multiSelect` off (default),
 *   selecting a second node REPLACES the first (`getSelectedNodes()` holds one);
 *   with `multiSelect: true`, selections ACCUMULATE (the set grows).
 * - [ ] A deeply nested node renders indented under its full parent chain — the
 *   on-screen depth/indent matches the data nesting, not a flat list.
 * - [ ] If `showCheckboxes` is enabled, a checkbox renders per node and toggling
 *   one updates that node's selected state and `getSelectedNodes()`. Where the
 *   app wires parent/child cascade, checking a parent also checks its rendered
 *   children (the core exposes selection state, not a built-in cascade).
 * - [ ] If `draggable` is enabled, dragging a node onto another fires `onDrop`
 *   with the source, target, and position (`before`/`after`/`inside`) and the
 *   tree re-renders in the new order; `onDrop` never fires when `draggable` is
 *   off.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

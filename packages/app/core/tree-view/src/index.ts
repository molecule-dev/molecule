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
 * import type { TreeNode } from '@molecule/app-tree-view'
 * import { provider } from '@molecule/app-tree-view-default'
 *
 * setProvider(provider) // once, at startup (bonds.ts) — requireProvider() throws until then
 *
 * interface FileMeta {
 *   path: string
 * }
 *
 * const files: TreeNode<FileMeta>[] = [
 *   {
 *     id: 'src',
 *     label: 'src',
 *     data: { path: 'src' },
 *     children: [
 *       { id: 'main', label: 'main.ts', data: { path: 'src/main.ts' } },
 *       { id: 'util', label: 'util.ts', data: { path: 'src/util.ts' } },
 *     ],
 *   },
 *   { id: 'readme', label: 'README.md', data: { path: 'README.md' } },
 * ]
 *
 * let openPath = ''
 * const tree = requireProvider().createTree<FileMeta>({
 *   data: files, // COPIED — later edits to `files` are not seen; use tree.setData()
 *   draggable: true, // without it moveNode() just returns false
 *   onSelect: (node) => {
 *     openPath = node.data?.path ?? ''
 *   },
 *   onDrop: (source, target, position) => console.log(`${source.id} ${position} ${target.id}`),
 * })
 *
 * tree.expandNode('src')
 * tree.selectNode('main') // single-select: clears every other selection first
 * tree.moveNode('readme', 'src', 'inside') // logs 'readme inside src' — persist the move here
 *
 * // No change events — re-render from getData() after every call:
 * const src = tree.getData()[0]
 * console.log(openPath, src?.expanded, src?.children?.map((node) => node.label))
 * // 'src/main.ts' true ['main.ts', 'util.ts', 'README.md']
 *
 * tree.destroy() // on unmount
 * ```
 *
 * @remarks
 * - **The instance is HEADLESS state, not UI.** `createTree` returns tree state
 *   operations (`expandNode`/`selectNode`/`getData`/…) — nothing appears on
 *   screen. The app renders the nodes itself, re-rendering after state calls;
 *   style via `getClassMap()` from `@molecule/app-ui` and run node labels that
 *   are UI text through `t('key', values, { defaultValue })`.
 * - **Wire it with THIS package's `setProvider()` or `bond('tree-view', …)`.**
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so
 *   both write the same slot; {@link requireProvider} throws until one has run.
 * - Drive reordering with `moveNode(sourceId, targetId, position)` — it mutates
 *   the tree and fires `onDrop` only when `draggable: true`, and is a rejected
 *   no-op otherwise. Drive checkbox state with `toggleChecked(id)` +
 *   `getCheckedNodes()`, active only when `showCheckboxes: true`; the checkbox
 *   (`checked`) state is independent of selection (`selected`). `multiSelect`,
 *   `draggable`, and `showCheckboxes` all default to `false`.
 * - The default bond works on a deep COPY of `data`: mutating your array/nodes
 *   afterwards changes nothing, and `getData()` returns a fresh copy — call it
 *   again after each operation to re-render. There is no subscription API.
 * - `onExpand` fires on `collapseNode()` too (check `node.expanded`);
 *   `expandAll()`/`collapseAll()` fire nothing. Disabled nodes cannot be
 *   selected or checked.
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

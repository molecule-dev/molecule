/**
 * Default provider for `@molecule/app-tree-view`.
 *
 * Provides an in-memory tree view implementation with node management,
 * selection, and expansion control.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-tree-view-default'
 * import { setProvider } from '@molecule/app-tree-view'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * Fully supported: node CRUD, expansion
 * (`expandNode`/`collapseNode`/`expandAll`/`collapseAll`), selection with
 * `multiSelect`, and `onExpand` (which fires on BOTH expand and collapse —
 * read `node.expanded` to tell which). Checkboxes: when created with
 * `showCheckboxes: true`, `toggleChecked(id)` flips a node's `checked` state
 * (independent of `selected`, skips disabled nodes) and `getCheckedNodes()`
 * returns the checked set; with the knob off, `toggleChecked` is a no-op. Drag:
 * when created with `draggable: true`, `moveNode(sourceId, targetId, position)`
 * reparents/reorders the node (`before`/`after` as a sibling, `inside` as a
 * child), fires `onDrop(source, target, position)`, and returns `true`; with
 * the knob off — or for a self/descendant/unknown target — it is a rejected
 * no-op returning `false` and `onDrop` never fires. `getData()` returns a deep
 * clone — mutate via the instance methods, not the returned array
 * (`getSelectedNodes()`/`getCheckedNodes()` and the `on*` callbacks expose the
 * live internal nodes).
 */

export * from './provider.js'
export * from './types.js'

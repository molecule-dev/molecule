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
 * Not implemented by this provider: `TreeOptions.draggable`/`onDrop` and
 * `showCheckboxes` are accepted but ignored — no drop events ever fire and no
 * checkbox state is managed. Fully supported: node CRUD, expansion
 * (`expandNode`/`collapseNode`/`expandAll`/`collapseAll`), selection with
 * `multiSelect`, and `onExpand` (which fires on BOTH expand and collapse —
 * read `node.expanded` to tell which). `getData()`/`getSelectedNodes()` return
 * deep clones — mutate via the instance methods, not the returned arrays.
 */

export * from './provider.js'
export * from './types.js'

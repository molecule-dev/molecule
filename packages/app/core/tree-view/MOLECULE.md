# @molecule/app-tree-view

Tree view core interface for molecule.dev.

Provides a standardized API for hierarchical tree UI components
with support for selection, expansion, drag-and-drop, and checkboxes.
Bond a provider (e.g. `@molecule/app-tree-view-default`) to supply
the concrete implementation.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-tree-view'
import { provider } from '@molecule/app-tree-view-default'

setProvider(provider) // once, at startup (bonds.ts)

const tree = requireProvider().createTree({
  data: [
    { id: 'root', label: 'Root', children: [{ id: 'child', label: 'Child' }] },
  ],
  onSelect: (node) => openNode(node),
})
tree.expandNode('root')
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-tree-view
```

## API

### Interfaces

#### `TreeInstance`

A live tree view instance returned by the provider.

```typescript
interface TreeInstance<T = unknown> {
  /**
   * Returns the current tree data.
   *
   * @returns Array of root-level tree nodes.
   */
  getData(): TreeNode<T>[]

  /**
   * Replaces the tree data.
   *
   * @param data - New root-level tree nodes.
   */
  setData(data: TreeNode<T>[]): void

  /**
   * Expands a node by its ID.
   *
   * @param id - The node ID to expand.
   */
  expandNode(id: string): void

  /**
   * Collapses a node by its ID.
   *
   * @param id - The node ID to collapse.
   */
  collapseNode(id: string): void

  /**
   * Expands all nodes in the tree.
   */
  expandAll(): void

  /**
   * Collapses all nodes in the tree.
   */
  collapseAll(): void

  /**
   * Selects a node by its ID.
   *
   * @param id - The node ID to select.
   */
  selectNode(id: string): void

  /**
   * Returns all currently selected nodes.
   *
   * @returns Array of selected tree nodes.
   */
  getSelectedNodes(): TreeNode<T>[]

  /**
   * Destroys the tree view instance and cleans up resources.
   */
  destroy(): void
}
```

#### `TreeNode`

A node in a tree hierarchy.

```typescript
interface TreeNode<T = unknown> {
  /** Unique identifier for the node. */
  id: string

  /** Display label for the node. */
  label: string

  /** Child nodes. */
  children?: TreeNode<T>[]

  /** Optional data payload attached to the node. */
  data?: T

  /** Optional icon identifier. */
  icon?: string

  /** Whether the node is expanded. */
  expanded?: boolean

  /** Whether the node is selected. */
  selected?: boolean

  /** Whether the node is disabled (non-interactive). */
  disabled?: boolean
}
```

#### `TreeOptions`

Configuration options for creating a tree view.

```typescript
interface TreeOptions<T = unknown> {
  /** Root-level tree data. */
  data: TreeNode<T>[]

  /** Callback when a node is selected. */
  onSelect?: (node: TreeNode<T>) => void

  /** Callback when a node is expanded or collapsed. */
  onExpand?: (node: TreeNode<T>) => void

  /** Whether multiple nodes can be selected simultaneously. Defaults to `false`. */
  multiSelect?: boolean

  /** Whether nodes can be dragged to reorder. Defaults to `false`. */
  draggable?: boolean

  /** Callback when a node is dropped onto another. */
  onDrop?: (
    source: TreeNode<T>,
    target: TreeNode<T>,
    position: 'before' | 'after' | 'inside',
  ) => void

  /** Whether to show checkboxes for each node. Defaults to `false`. */
  showCheckboxes?: boolean
}
```

#### `TreeViewProvider`

Tree view provider interface.

All tree view providers must implement this interface to create
and manage hierarchical tree UI components.

```typescript
interface TreeViewProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new tree view instance.
   *
   * @param options - Configuration for the tree view.
   * @returns A tree instance for managing the tree.
   */
  createTree<T = unknown>(options: TreeOptions<T>): TreeInstance<T>
}
```

### Functions

#### `getProvider()`

Retrieves the bonded tree view provider, or `null` if none is bonded.

```typescript
function getProvider(): TreeViewProvider | null
```

**Returns:** The active tree view provider, or `null`.

#### `hasProvider()`

Checks whether a tree view provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a tree view provider is available.

#### `requireProvider()`

Retrieves the bonded tree view provider, throwing if none is configured.

```typescript
function requireProvider(): TreeViewProvider
```

**Returns:** The active tree view provider.

#### `setProvider(provider)`

Registers a tree view provider as the active singleton.

```typescript
function setProvider(provider: TreeViewProvider): void
```

- `provider` — The tree view provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Tree View | `@molecule/app-tree-view-default` |

## Injection Notes

- **The instance is HEADLESS state, not UI.** `createTree` returns tree state
  operations (`expandNode`/`selectNode`/`getData`/…) — nothing appears on
  screen. The app renders the nodes itself, re-rendering after state calls;
  style via `getClassMap()` from `@molecule/app-ui` and run node labels that
  are UI text through `t('key', values, { defaultValue })`.
- **Wire the bond at startup** — {@link requireProvider} throws until
  `setProvider` has been called.
- `onDrop` only fires when `draggable: true`; `multiSelect` and
  `showCheckboxes` default to `false`.
- Call `destroy()` when the owning screen unmounts.

## E2E Tests

End-to-end checklist — drive the RENDERED tree in the live preview (real
nodes, no mocks), adapt each item to this app's actual tree screen, and check
every box off one by one. A box you can't check is an integration bug to fix
— not a skip:
- [ ] The root-level nodes from `data` render on screen with their labels; a
  node with `children` shows an expand/collapse affordance and a leaf does
  not. A node with `disabled: true` renders non-interactive — clicking it
  neither selects it nor fires `onSelect`.
- [ ] Expanding a parent reveals its child rows and collapsing hides them
  again, and the expanded STATE is reflected: the re-rendered node shows its
  expanded affordance and the node's `expanded` flag in `getData()` matches
  what's on screen. `expandAll()`/`collapseAll()` open/close the whole tree;
  each toggle fires `onExpand` with the affected node.
- [ ] Clicking a node selects it: `onSelect` fires with THAT node (verify its
  `id`/`label`), the row is visibly highlighted, and the node appears in
  `getSelectedNodes()`.
- [ ] Single vs multi matches config: with `multiSelect` off (default),
  selecting a second node REPLACES the first (`getSelectedNodes()` holds one);
  with `multiSelect: true`, selections ACCUMULATE (the set grows).
- [ ] A deeply nested node renders indented under its full parent chain — the
  on-screen depth/indent matches the data nesting, not a flat list.
- [ ] If `showCheckboxes` is enabled, a checkbox renders per node and toggling
  one updates that node's selected state and `getSelectedNodes()`. Where the
  app wires parent/child cascade, checking a parent also checks its rendered
  children (the core exposes selection state, not a built-in cascade).
- [ ] If `draggable` is enabled, dragging a node onto another fires `onDrop`
  with the source, target, and position (`before`/`after`/`inside`) and the
  tree re-renders in the new order; `onDrop` never fires when `draggable` is
  off.

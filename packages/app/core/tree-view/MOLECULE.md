# @molecule/app-tree-view

Tree view core interface for molecule.dev.

Provides a standardized API for hierarchical tree UI components
with support for selection, expansion, drag-and-drop, and checkboxes.
Bond a provider (e.g. `@molecule/app-tree-view-default`) to supply
the concrete implementation.

## Type
`core`

## Installation
```bash
npm install @molecule/app-tree-view
```

## Usage

```typescript
import { requireProvider } from '@molecule/app-tree-view'

const tree = requireProvider().createTree({
  data: [
    { id: 'root', label: 'Root', children: [
      { id: 'child', label: 'Child' },
    ]},
  ],
  onSelect: (node) => console.log(node.label),
})
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

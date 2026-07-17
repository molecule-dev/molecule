# @molecule/app-tree-view-default

Default provider for `@molecule/app-tree-view`.

Provides an in-memory tree view implementation with node management,
selection, and expansion control.

## Quick Start

```typescript
import { provider } from '@molecule/app-tree-view-default'
import { setProvider } from '@molecule/app-tree-view'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-tree-view-default @molecule/app-tree-view
```

## API

### Interfaces

#### `DefaultTreeViewConfig`

Provider-specific configuration options.

```typescript
interface DefaultTreeViewConfig {
  /** Whether to expand all nodes by default. Defaults to `false`. */
  expandAll?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a default tree view provider.

```typescript
function createProvider(config?: DefaultTreeViewConfig): TreeViewProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured TreeViewProvider.

### Constants

#### `provider`

Default tree view provider instance.

```typescript
const provider: TreeViewProvider
```

## Core Interface
Implements `@molecule/app-tree-view` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-tree-view'
import { provider } from '@molecule/app-tree-view-default'

export function setupTreeViewDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-tree-view` ^1.0.0

### Runtime Dependencies

- `@molecule/app-tree-view`

Fully supported: node CRUD, expansion
(`expandNode`/`collapseNode`/`expandAll`/`collapseAll`), selection with
`multiSelect`, and `onExpand` (which fires on BOTH expand and collapse —
read `node.expanded` to tell which). Checkboxes: when created with
`showCheckboxes: true`, `toggleChecked(id)` flips a node's `checked` state
(independent of `selected`, skips disabled nodes) and `getCheckedNodes()`
returns the checked set; with the knob off, `toggleChecked` is a no-op. Drag:
when created with `draggable: true`, `moveNode(sourceId, targetId, position)`
reparents/reorders the node (`before`/`after` as a sibling, `inside` as a
child), fires `onDrop(source, target, position)`, and returns `true`; with
the knob off — or for a self/descendant/unknown target — it is a rejected
no-op returning `false` and `onDrop` never fires. `getData()` returns a deep
clone — mutate via the instance methods, not the returned array
(`getSelectedNodes()`/`getCheckedNodes()` and the `on*` callbacks expose the
live internal nodes).

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

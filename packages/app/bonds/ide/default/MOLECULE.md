# @molecule/app-ide-default

Default IDE workspace provider for molecule.dev — panel layout state
(chat / editor / preview), sizes, collapse/active state, with optional
persistence through an injectable storage adapter.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-ide'
import { provider } from '@molecule/app-ide-default'

setProvider(provider)   // once, at app startup (bonds.ts)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ide-default @molecule/app-ide
```

## API

### Interfaces

#### `DefaultWorkspaceConfig`

Configuration for default workspace.

```typescript
interface DefaultWorkspaceConfig {
  /** Default panel layout. */
  defaultLayout?: WorkspaceLayout
  /** Persist layout using the provided storage adapter. */
  persistLayout?: boolean
  /** Key for storage persistence. */
  storageKey?: string
  /** Storage adapter for persistence. Required when persistLayout is true. */
  storage?: StorageAdapter
}
```

#### `StorageAdapter`

Adapter interface for storage.

```typescript
interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
```

### Classes

#### `DefaultWorkspaceProvider`

Default implementation of `WorkspaceProvider`. Manages panel layout (chat, editor, preview),
sizes, visibility, collapse state, and optional persistence via a storage adapter.

### Functions

#### `createProvider(config)`

Creates a `DefaultWorkspaceProvider` with optional layout configuration and persistence.

```typescript
function createProvider(config?: DefaultWorkspaceConfig): DefaultWorkspaceProvider
```

- `config` — Workspace configuration (default layout, persistence options, storage adapter).

**Returns:** A `DefaultWorkspaceProvider` that manages panel layout state.

#### `getBrowserStorage()`

Returns a {@link StorageAdapter} backed by the browser's `localStorage`, or
`null` when no usable `localStorage` exists. A `null` result means
"persistence unavailable — fall back to in-memory".

```typescript
function getBrowserStorage(): StorageAdapter | null
```

**Returns:** A `localStorage`-backed adapter, or `null` if unavailable.

### Constants

#### `provider`

Pre-instantiated provider singleton. Persists the layout to the browser's
`localStorage` when available, so a panel resize survives a page reload;
falls back to a non-persistent in-memory provider where storage is missing
or blocked (SSR, tests). Consumers wanting different behavior (a custom
storage adapter, key, or opting out) should call {@link createProvider}.

```typescript
const provider: DefaultWorkspaceProvider
```

## Core Interface
Implements `@molecule/app-ide` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-ide'
import { provider } from '@molecule/app-ide-default'

export function setupIdeDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ide` ^1.0.0

### Runtime Dependencies

- `@molecule/app-ide`

- **A persisted layout SHADOWS default-layout changes.** The `provider`
  singleton saves to `localStorage` key `'molecule-workspace-layout'`; once a
  user has a saved layout, changes to `defaultLayout` (or the built-in
  default) have no visible effect until `resetLayout()` runs or the key is
  cleared. If "my layout change doesn't show up", this is why.
- Default layout: `chat` (left, 25%) / `editor` (center, 50%) / `preview`
  (right, 25%). `PanelId` accepts custom strings — extend the layout rather
  than building a parallel one.
- State-only: pair with `@molecule/app-ide-react` (or your own renderer
  reading `getLayout()` + `subscribe()`).
- Need different persistence (custom adapter, key, or none)? Build your own
  instance with `createProvider({...})` instead of the singleton.

## E2E Tests

Integration checklist — drive the real rendered UI (live preview, no mocks):
`navigate_preview` to the IDE, `read_preview_ui` to snapshot the panel
regions, `interact_preview` to drag dividers and toggle panels. Adapt each
item to this app's actual panels/layout and check every box off one by one.
A box you can't check is an integration bug to fix — not a skip:
- [ ] The IDE renders its panel regions in the default layout — snapshot the
  preview and confirm each visible panel the app configures (e.g. a left
  sidebar/files, a center editor, a right preview, a bottom terminal) is
  present and laid out, none overlapping or collapsed to nothing.
- [ ] Dragging a divider between two panels resizes the adjacent panels and
  the sizes update live — grab the handle, drag, and confirm in a fresh
  snapshot that both neighbors changed size (not the whole window, no
  snap-back to the previous sizes).
- [ ] Toggling a panel's visibility (hide the terminal or the sidebar via its
  control) removes it from the layout, and toggling again restores it in the
  same position — the neighbors reflow to fill, they don't leave a blank gap.
- [ ] Collapsing a collapsible panel shrinks it out of the way and expanding
  restores its prior size; clicking into a panel updates the active-panel
  state (its highlight/toolbar follows the panel you focus).
- [ ] A resized / collapsed / hidden layout PERSISTS across a full reload —
  after reload the panels return at the sizes and visibility you left them,
  not reset to the default layout (the default bond persists to browser
  storage).
- [ ] A panel's minimum size is respected — dragging a divider to the far end
  cannot shrink a resizable panel to zero or an unusable sliver; it stops at
  its configured min.

# @molecule/app-ide

IDE workspace core interface for molecule.dev.

Framework-agnostic contract for multi-panel workspace layouts (chat,
editor, preview, terminal, …): panel visibility, sizing, active panel,
and layout persistence. Bond a provider (e.g. `@molecule/app-ide-default`,
which persists layout in browser storage) at startup; a framework binding
(e.g. `@molecule/app-ide-react`) renders the layout from this state.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/app-ide'
import { provider } from '@molecule/app-ide-default'

setProvider(provider)                    // once, at app startup (bonds.ts)

const workspace = requireProvider()
workspace.togglePanel('terminal')
const unsubscribe = workspace.subscribe((state) => renderLayout(state))
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-ide @molecule/app-bond @molecule/app-i18n
```

## API

### Interfaces

#### `PanelConfig`

Configuration for an individual workspace panel including
position, sizing constraints, and visibility.

```typescript
interface PanelConfig {
  id: PanelId
  position: PanelPosition
  minWidth?: number
  minHeight?: number
  defaultSize?: number
  resizable?: boolean
  collapsible?: boolean
  visible?: boolean
}
```

#### `WorkspaceConfig`

Configuration options for creating a workspace provider.

```typescript
interface WorkspaceConfig {
  defaultLayout: WorkspaceLayout
  persistLayout?: boolean
  storageKey?: string
}
```

#### `WorkspaceLayout`

Complete workspace layout describing panel arrangement and sizing.

```typescript
interface WorkspaceLayout {
  panels: PanelConfig[]
  sizes: Record<PanelPosition, number[]>
}
```

#### `WorkspaceProvider`

Workspace provider interface that all IDE workspace bond packages
must implement. Manages panel layout, sizing, and visibility.

```typescript
interface WorkspaceProvider {
  /** Provider name identifier. */
  readonly name: string

  /** Returns the current workspace layout. */
  getLayout(): WorkspaceLayout

  /** Sets the entire workspace layout. */
  setLayout(layout: WorkspaceLayout): void

  /** Toggles visibility of a panel by ID. */
  togglePanel(panelId: PanelId): void

  /** Resizes a panel to the given size. */
  resizePanel(panelId: PanelId, size: number): void

  /** Sets the active (focused) panel. */
  setActivePanel(panelId: PanelId): void

  /**
   * Subscribes to workspace state changes.
   *
   * @returns An unsubscribe function.
   */
  subscribe(callback: (state: WorkspaceState) => void): () => void

  /** Resets layout to the default configuration. */
  resetLayout(): void
}
```

#### `WorkspaceState`

Current workspace state including layout, active panel,
collapsed panels, and fullscreen mode.

```typescript
interface WorkspaceState {
  layout: WorkspaceLayout
  activePanel: PanelId | null
  collapsedPanels: Set<PanelId>
  isFullscreen: boolean
}
```

### Types

#### `PanelId`

Identifier for a workspace panel (built-in names or custom strings).

```typescript
type PanelId = 'chat' | 'editor' | 'preview' | 'terminal' | 'deploy' | 'files' | string
```

#### `PanelPosition`

Position of a panel within the workspace layout.

```typescript
type PanelPosition = 'left' | 'center' | 'right' | 'bottom'
```

### Functions

#### `getProvider()`

Retrieves the bonded IDE workspace provider, or `null` if none is bonded.

```typescript
function getProvider(): WorkspaceProvider | null
```

**Returns:** The bonded workspace provider, or `null`.

#### `hasProvider()`

Checks whether an IDE workspace provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an IDE workspace provider is bonded.

#### `requireProvider()`

Retrieves the bonded IDE workspace provider, throwing if none is configured.

```typescript
function requireProvider(): WorkspaceProvider
```

**Returns:** The bonded workspace provider.

#### `setProvider(provider)`

Registers an IDE workspace provider as the active singleton.

```typescript
function setProvider(provider: WorkspaceProvider): void
```

- `provider` — The workspace provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Default | `@molecule/app-ide-default` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`
- `@molecule/app-i18n`

- **This core manages layout STATE only — panels render via a framework
  binding** (React: `@molecule/app-ide-react`) or your own components reading
  `getLayout()` + `subscribe()`. Wire the bond before the workspace mounts.
- `subscribe()` returns an unsubscribe function — call it on teardown to avoid
  duplicate renders after remounts.
- `PanelId` accepts custom strings beyond the built-ins ('chat' | 'editor' |
  'preview' | 'terminal' | 'deploy' | 'files') — register custom panels in the
  layout rather than hardcoding a parallel layout system.
- Layout persistence is the provider's concern (the default bond uses browser
  storage) — never write layout state to `localStorage` yourself.

## Translations

Translation strings are provided by `@molecule/app-locales-ide`.

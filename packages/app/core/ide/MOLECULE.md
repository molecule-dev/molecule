# @molecule/app-ide

IDE workspace core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ide
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

## Translations

Translation strings are provided by `@molecule/app-locales-ide`.

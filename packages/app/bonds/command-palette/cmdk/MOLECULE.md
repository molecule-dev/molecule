# @molecule/app-command-palette-cmdk

cmdk command palette provider for molecule.dev.

Implements `CommandPaletteProvider` from `@molecule/app-command-palette` using
a cmdk-style headless state management approach. Framework bindings
connect the headless state to the actual cmdk DOM library.

## Quick Start

```typescript
import { provider } from '@molecule/app-command-palette-cmdk'
import { setProvider } from '@molecule/app-command-palette'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-command-palette-cmdk
```

## API

### Interfaces

#### `CmdkConfig`

Provider-specific configuration for the cmdk command palette provider.

```typescript
interface CmdkConfig {
  /**
   * Whether to use built-in fuzzy matching or defer to the consumer's
   * custom `filter` function. Defaults to `true` (built-in fuzzy).
   */
  defaultFuzzyMatch?: boolean

  /**
   * Default loop setting for keyboard navigation when no explicit
   * `loop` option is provided. Defaults to `true`.
   */
  defaultLoop?: boolean
}
```

#### `CmdkPaletteInstance`

Extended command palette instance with cmdk-specific internal methods
used by framework bindings.

```typescript
interface CmdkPaletteInstance {
  // -- Public API (from CommandPaletteInstance) --------------------------------
  open(): void
  close(): void
  toggle(): void
  isOpen(): boolean
  getQuery(): string
  setQuery(query: string): void
  getFilteredGroups(): CommandGroup[]
  pushPage(pageId: string): void
  popPage(): boolean
  getPageStack(): string[]
  getCurrentPage(): string
  setGroups(groups: CommandGroup[]): void
  addGroup(group: CommandGroup): void
  removeGroup(groupId: string): void
  addCommand(groupId: string, command: CommandItem): void
  removeCommand(commandId: string): void
  destroy(): void

  // -- Internal methods for framework bindings --------------------------------

  /** Returns the cmdk-specific config. */
  _getConfig(): CmdkConfig

  /** Returns whether keyboard navigation should loop. */
  _getLoop(): boolean

  /** Returns the placeholder for the current page. */
  _getPlaceholder(): string | undefined

  /**
   * Executes a command by id, handling page navigation returns.
   *
   * @param commandId - The id of the command to execute.
   */
  _executeCommand(commandId: string): void
}
```

### Functions

#### `createCmdkProvider(config)`

Creates a cmdk-style command palette provider.

```typescript
function createCmdkProvider(config?: CmdkConfig): CommandPaletteProvider
```

- `config` — Optional cmdk-specific configuration.

**Returns:** A `CommandPaletteProvider` backed by cmdk-style state management.

### Constants

#### `provider`

Default cmdk command palette provider instance.

```typescript
const provider: CommandPaletteProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-command-palette` >=1.0.0

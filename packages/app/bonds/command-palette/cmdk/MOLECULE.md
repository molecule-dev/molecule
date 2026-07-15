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
npm install @molecule/app-command-palette-cmdk @molecule/app-command-palette
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

## Core Interface
Implements `@molecule/app-command-palette` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-command-palette'
import { provider } from '@molecule/app-command-palette-cmdk'

export function setupCommandPaletteCmdk(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-command-palette` >=1.0.0

### Runtime Dependencies

- `@molecule/app-command-palette`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The palette opens with the keyboard shortcut (Cmd+K / Ctrl+K) and via any
  visible trigger, and closes with Escape.
- [ ] Commands render in their groups, and typing fuzzy-filters them down to
  matches.
- [ ] Selecting a navigation command actually navigates (the URL/screen
  changes) — not just closes the palette.
- [ ] Executing an action command performs the real action with a visible
  effect.
- [ ] The whole flow works keyboard-only: arrow keys move the highlight, Enter
  executes the highlighted command.
- [ ] A query with no matches shows an empty state, not a stale or broken list.

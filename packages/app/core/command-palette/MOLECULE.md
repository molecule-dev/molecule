# @molecule/app-command-palette

Command palette core interface for molecule.dev.

Provides a framework-agnostic contract for Cmd+K / Ctrl+K command palettes
with hierarchical groups, nested pages, and fuzzy search. Bond a provider
(e.g. `@molecule/app-command-palette-cmdk`) at startup, then use
{@link createPalette} anywhere.

## Type
`core`

## Installation
```bash
npm install @molecule/app-command-palette
```

## Usage

```typescript
import { setProvider, createPalette } from '@molecule/app-command-palette'
import { provider } from '@molecule/app-command-palette-cmdk'

setProvider(provider)

const palette = createPalette({
  groups: [
    {
      id: 'navigation',
      label: 'Navigation',
      commands: [
        { id: 'home', label: 'Go Home', onSelect: () => navigate('/') },
        { id: 'settings', label: 'Settings', onSelect: () => navigate('/settings') },
      ],
    },
  ],
  placeholder: 'Type a command…',
})
```

## API

### Interfaces

#### `CommandGroup`

A named group of commands for visual categorisation in the palette.

```typescript
interface CommandGroup {
  /** Unique identifier for the group. */
  id: string
  /** Display label for the group heading. */
  label: string
  /** Commands in this group. */
  commands: CommandItem[]
  /** Optional priority for sorting groups (higher = shown first). Defaults to `0`. */
  priority?: number
}
```

#### `CommandItem`

A single command that can appear in the palette.

```typescript
interface CommandItem {
  /** Unique identifier for the command. */
  id: string
  /** Display label for the command (pass through i18n before setting). */
  label: string
  /** Optional group this command belongs to (e.g. "Navigation", "Actions"). */
  group?: string
  /** Optional keywords for improved search matching beyond the label. */
  keywords?: string[]
  /** Optional icon identifier (resolved by framework bindings). */
  icon?: string
  /** Optional keyboard shortcut label (e.g. "⌘K", "Ctrl+Shift+P"). */
  shortcut?: string
  /** Whether the command is currently disabled. Defaults to `false`. */
  disabled?: boolean
  /**
   * Action to execute when this command is selected.
   * Returning a string navigates to that page id within the palette.
   */
  onSelect: () => void | string
  /** Optional priority for sorting (higher = shown first). Defaults to `0`. */
  priority?: number
}
```

#### `CommandPage`

A nested page within the command palette.

Pages allow drilling into a sub-context (e.g. selecting a project first,
then showing project-specific commands).

```typescript
interface CommandPage {
  /** Unique identifier for the page. */
  id: string
  /** Display label shown in the breadcrumb trail. */
  label: string
  /** Groups of commands available on this page. */
  groups: CommandGroup[]
  /** Optional placeholder text for the search input on this page. */
  placeholder?: string
}
```

#### `CommandPaletteInstance`

A live command palette instance exposing query and mutation methods.

```typescript
interface CommandPaletteInstance {
  // -- Open / Close --------------------------------------------------------

  /** Opens the command palette. */
  open(): void

  /** Closes the command palette. */
  close(): void

  /** Toggles the command palette open/closed. */
  toggle(): void

  /** Returns whether the palette is currently open. */
  isOpen(): boolean

  // -- Search --------------------------------------------------------------

  /** Returns the current search query. */
  getQuery(): string

  /**
   * Sets the search query, triggering filtering.
   *
   * @param query - The search string.
   */
  setQuery(query: string): void

  /**
   * Returns the filtered list of commands matching the current query.
   *
   * @returns Groups with only matching commands (empty groups are excluded).
   */
  getFilteredGroups(): CommandGroup[]

  // -- Page navigation -----------------------------------------------------

  /**
   * Navigates to a nested page by id.
   *
   * @param pageId - The id of the page to navigate to.
   */
  pushPage(pageId: string): void

  /** Navigates back to the previous page. Returns `false` if already at root. */
  popPage(): boolean

  /** Returns the current page stack (root page id is `'root'`). */
  getPageStack(): string[]

  /** Returns the current page id. */
  getCurrentPage(): string

  // -- Commands ------------------------------------------------------------

  /**
   * Replaces all command groups on the root page.
   *
   * @param groups - The new command groups.
   */
  setGroups(groups: CommandGroup[]): void

  /**
   * Adds a command group. If a group with the same id exists, merges commands.
   *
   * @param group - The command group to add or merge.
   */
  addGroup(group: CommandGroup): void

  /**
   * Removes a command group by id.
   *
   * @param groupId - The id of the group to remove.
   */
  removeGroup(groupId: string): void

  /**
   * Adds a single command to a group.
   *
   * @param groupId - The id of the group to add the command to.
   * @param command - The command to add.
   */
  addCommand(groupId: string, command: CommandItem): void

  /**
   * Removes a single command by id from all groups.
   *
   * @param commandId - The id of the command to remove.
   */
  removeCommand(commandId: string): void

  // -- Lifecycle -----------------------------------------------------------

  /** Releases resources held by the command palette instance. */
  destroy(): void
}
```

#### `CommandPaletteOptions`

Configuration for creating a command palette instance.

```typescript
interface CommandPaletteOptions {
  /** Command groups for the root page. */
  groups: CommandGroup[]
  /** Optional placeholder text for the search input. */
  placeholder?: string
  /** Optional nested pages for hierarchical navigation. */
  pages?: CommandPage[]
  /** Called when the palette is opened. */
  onOpen?: () => void
  /** Called when the palette is closed. */
  onClose?: () => void
  /** Called whenever the search query changes. */
  onSearch?: (query: string) => void
  /**
   * Custom filter function. Return a score > 0 to include the item,
   * higher scores rank higher. Return 0 or negative to exclude.
   * When not provided, the provider uses built-in fuzzy matching.
   */
  filter?: (query: string, item: CommandItem) => number
  /** Whether the palette should loop keyboard navigation. Defaults to `true`. */
  loop?: boolean
}
```

#### `CommandPaletteProvider`

Contract that bond packages must implement to provide command palette
functionality.

```typescript
interface CommandPaletteProvider {
  /**
   * Creates a new command palette instance from the given options.
   *
   * @param options - Command palette configuration.
   * @returns A command palette instance.
   */
  createPalette(options: CommandPaletteOptions): CommandPaletteInstance
}
```

### Functions

#### `createPalette(options)`

Creates a command palette instance using the bonded provider.

```typescript
function createPalette(options: CommandPaletteOptions): CommandPaletteInstance
```

- `options` — Command palette configuration.

**Returns:** A command palette instance.

#### `getProvider()`

Retrieves the bonded command palette provider, throwing if none is configured.

```typescript
function getProvider(): CommandPaletteProvider
```

**Returns:** The bonded command palette provider.

#### `hasProvider()`

Checks whether a command palette provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a command palette provider is bonded.

#### `setProvider(provider)`

Registers a command palette provider as the active singleton. Called by bond
packages (e.g. `@molecule/app-command-palette-cmdk`) during app startup.

```typescript
function setProvider(provider: CommandPaletteProvider): void
```

- `provider` — The command palette provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

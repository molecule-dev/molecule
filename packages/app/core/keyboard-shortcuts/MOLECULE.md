# @molecule/app-keyboard-shortcuts

Keyboard shortcuts core interface for molecule.dev.

Provides a standardized API for registering and managing keyboard
shortcuts across the application. Bond a provider
(e.g. `@molecule/app-keyboard-shortcuts-hotkeys`) to supply
the concrete implementation.

## Quick Start

```typescript
import { requireProvider } from '@molecule/app-keyboard-shortcuts'

const shortcuts = requireProvider()
const unregister = shortcuts.register({
  keys: 'ctrl+s',
  handler: (e) => { e.preventDefault(); save() },
  description: 'Save document',
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-keyboard-shortcuts
```

## API

### Interfaces

#### `KeyboardShortcutsProvider`

Keyboard shortcuts provider interface.

All keyboard shortcut providers must implement this interface
to manage hotkey bindings across the application.

```typescript
interface KeyboardShortcutsProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Registers a single keyboard shortcut.
   *
   * @param shortcut - The shortcut definition to register.
   * @returns A function that unregisters the shortcut when called.
   */
  register(shortcut: Shortcut): () => void

  /**
   * Registers multiple keyboard shortcuts at once.
   *
   * @param shortcuts - Array of shortcut definitions to register.
   * @returns A function that unregisters all shortcuts when called.
   */
  registerMany(shortcuts: Shortcut[]): () => void

  /**
   * Unregisters a shortcut by its key combination.
   *
   * @param keys - The key combination string to unregister.
   */
  unregister(keys: string): void

  /**
   * Unregisters all keyboard shortcuts.
   */
  unregisterAll(): void

  /**
   * Returns all currently registered shortcuts.
   *
   * @returns Array of registered shortcut descriptors.
   */
  getAll(): RegisteredShortcut[]

  /**
   * Checks whether a specific key is currently pressed.
   *
   * @param key - The key to check (e.g. 'shift', 'ctrl').
   * @returns `true` if the key is currently held down.
   */
  isPressed(key: string): boolean

  /**
   * Enables all shortcut handling.
   */
  enable(): void

  /**
   * Disables all shortcut handling.
   */
  disable(): void
}
```

#### `RegisteredShortcut`

A registered shortcut with runtime state.

```typescript
interface RegisteredShortcut {
  /** Key combination string. */
  keys: string

  /** Human-readable description of the shortcut action. */
  description?: string

  /** Scope the shortcut is restricted to. */
  scope?: string

  /** Whether the shortcut is currently enabled. */
  enabled: boolean
}
```

#### `Shortcut`

Keyboard shortcut definition.

```typescript
interface Shortcut {
  /** Key combination string (e.g. 'ctrl+s', 'shift+alt+n'). */
  keys: string

  /** Handler function invoked when the shortcut is triggered. */
  handler: (event: KeyboardEvent) => void

  /** Human-readable description of the shortcut action. */
  description?: string

  /** Scope to restrict the shortcut to (e.g. 'editor', 'modal'). */
  scope?: string

  /** Whether to call `preventDefault()` on the keyboard event. Defaults to `true`. */
  preventDefault?: boolean
}
```

### Functions

#### `getProvider()`

Retrieves the bonded keyboard shortcuts provider, or `null` if none is bonded.

```typescript
function getProvider(): KeyboardShortcutsProvider | null
```

**Returns:** The active keyboard shortcuts provider, or `null`.

#### `hasProvider()`

Checks whether a keyboard shortcuts provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a keyboard shortcuts provider is available.

#### `requireProvider()`

Retrieves the bonded keyboard shortcuts provider, throwing if none is configured.

```typescript
function requireProvider(): KeyboardShortcutsProvider
```

**Returns:** The active keyboard shortcuts provider.

#### `setProvider(provider)`

Registers a keyboard shortcuts provider as the active singleton.

```typescript
function setProvider(provider: KeyboardShortcutsProvider): void
```

- `provider` — The keyboard shortcuts provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Keyboard Shortcuts | `@molecule/app-keyboard-shortcuts-hotkeys` |

## Injection Notes

- **Wire with `setProvider()` from THIS package** (e.g. the `provider` export of
  `@molecule/app-keyboard-shortcuts-hotkeys`) once at startup —
  `requireProvider()` throws otherwise, and a generic `bond('…')` registration is
  not seen by this module-local singleton.
- **The bonded provider owns the actual key event binding** (global
  `keydown`/`keyup` listeners, combo matching, `preventDefault` per the
  `Shortcut.preventDefault` flag, and not firing while an
  input/textarea/contenteditable has focus). After wiring, PRESS a registered
  combo and confirm the real action runs — a registry that accepts `register()`
  calls but never fires handlers is an integration bug to fix, not to skip.
- `register()` returns an unregister function — call it when the owning
  screen/component unmounts, or stale shortcuts ghost-fire elsewhere.
- Shortcut `description`s surface in help overlays: pass them through
  `t('key', values, { defaultValue })`.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Every shortcut this app registers triggers its REAL action (find them
  in the app's shortcut help/registration, then press each one).
- [ ] Shortcuts that collide with browser defaults (e.g. Ctrl+S) run the app
  action and suppress the browser behavior (no save dialog).
- [ ] Shortcuts do NOT fire while typing in an input/textarea/contenteditable
  unless the shortcut is deliberately global.
- [ ] Navigating away from a screen unregisters its shortcuts — pressing them
  elsewhere causes no ghost actions.
- [ ] If a shortcuts help overlay exists, it lists the shortcuts that are
  actually registered (no phantom or missing entries).

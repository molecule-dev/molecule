# @molecule/app-keyboard-shortcuts-hotkeys

Keyboard-shortcuts provider for `@molecule/app-keyboard-shortcuts` — an
in-memory shortcut REGISTRY only. Despite the name, this bond does not use
the hotkeys-js library (no dependency) and attaches NO key event listener:
**registered handlers are never invoked by this bond.**

## Quick Start

```typescript
import { provider } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { setProvider } from '@molecule/app-keyboard-shortcuts'

setProvider(provider)   // once, at app startup (bonds.ts)

// This bond only RECORDS shortcuts (for help overlays via getAll()).
// The app must own dispatch itself:
window.addEventListener('keydown', (e) => {
  const combo = [e.ctrlKey && 'ctrl', e.shiftKey && 'shift', e.key.toLowerCase()]
    .filter(Boolean).join('+')
  const match = provider.getAll().find((s) => s.enabled && s.keys === combo)
  // honor the input/textarea/contenteditable guard + preventDefault here
})
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-keyboard-shortcuts-hotkeys @molecule/app-keyboard-shortcuts
```

## API

### Interfaces

#### `HotkeysConfig`

Provider-specific configuration options.

```typescript
interface HotkeysConfig {
  /** Default scope for shortcuts. Defaults to `'all'`. */
  defaultScope?: string

  /** Whether shortcuts are enabled initially. Defaults to `true`. */
  enabled?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a hotkeys-based keyboard shortcuts provider.

```typescript
function createProvider(config?: HotkeysConfig): KeyboardShortcutsProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured KeyboardShortcutsProvider.

### Constants

#### `provider`

Default hotkeys provider instance.

```typescript
const provider: KeyboardShortcutsProvider
```

## Core Interface
Implements `@molecule/app-keyboard-shortcuts` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-keyboard-shortcuts'
import { provider } from '@molecule/app-keyboard-shortcuts-hotkeys'

export function setupKeyboardShortcutsHotkeys(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-keyboard-shortcuts` ^1.0.0

### Runtime Dependencies

- `@molecule/app-keyboard-shortcuts`

- **This bond does NOT make shortcuts fire.** Nothing listens for `keydown`;
  `Shortcut.handler`, `preventDefault`, and `scope` are stored but ignored,
  and `isPressed()` always returns `false`. The app must own the keydown
  listener, combo matching, `preventDefault`, and the
  input/textarea/contenteditable guard — honoring `enable()`/`disable()` and
  per-shortcut `enabled` from `getAll()`.
- `HotkeysConfig.defaultScope` is currently INERT; only `enabled` is honored.
- **Wire with `setProvider()` from `@molecule/app-keyboard-shortcuts`** — the
  core keeps a module-local singleton; a generic
  `bond('keyboard-shortcuts', …)` silently no-ops.

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

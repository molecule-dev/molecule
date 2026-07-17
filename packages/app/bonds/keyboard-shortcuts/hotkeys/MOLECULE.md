# @molecule/app-keyboard-shortcuts-hotkeys

Keyboard-shortcuts provider for `@molecule/app-keyboard-shortcuts`, backed by
the `hotkeys-js` library. This bond attaches real global key listeners:
**a registered `Shortcut.handler` fires on the actual keypress.**

## Quick Start

```typescript
import { provider } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { setProvider } from '@molecule/app-keyboard-shortcuts'

setProvider(provider)   // once, at app startup (bonds.ts)

const unregister = provider.register({
  keys: 'ctrl+s',
  handler: () => save(),   // fires on Ctrl+S; preventDefault is automatic
  description: 'Save document',
})
// ...later, when the owning screen unmounts:
unregister()
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-keyboard-shortcuts-hotkeys @molecule/app-keyboard-shortcuts hotkeys-js
```

## API

### Interfaces

#### `HotkeysConfig`

Provider-specific configuration options.

```typescript
interface HotkeysConfig {
  /**
   * hotkeys-js scope assigned to shortcuts registered without their own
   * `scope`, and set as the active scope when the provider is created. Defaults
   * to `'all'` (shortcuts under `'all'` fire regardless of the active scope).
   */
  defaultScope?: string

  /** Whether shortcuts are enabled initially. Defaults to `true`. */
  enabled?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a `hotkeys-js`-backed keyboard shortcuts provider.

The returned provider binds every registered shortcut to `hotkeys-js`, so
handlers fire on real key events (the bug this bond previously had was that it
stored shortcuts in a Map but never attached a listener). hotkeys-js's default
`filter` suppresses firing while an input/textarea/select/contenteditable is
focused.

```typescript
function createProvider(config?: HotkeysConfig): KeyboardShortcutsProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured KeyboardShortcutsProvider whose handlers fire on keypress.

### Constants

#### `provider`

Default hotkeys-js keyboard shortcuts provider instance.

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
- `hotkeys-js`

- **Handlers fire for real.** `register()` binds via `hotkeys(combo, handler)`;
  pressing the combo invokes `Shortcut.handler` with the real `KeyboardEvent`.
  `event.preventDefault()` is called automatically unless
  `Shortcut.preventDefault === false` — so a combo that collides with a browser
  default (Ctrl+S, Ctrl+P) suppresses the browser action.
- **Input guard is built in.** hotkeys-js's default `filter` does not fire while
  an `input`/`textarea`/`select`/`contenteditable` is focused, so typing never
  triggers shortcuts unless you opt in.
- **Scopes.** A `Shortcut.scope` binds under that hotkeys-js scope and fires
  only while that scope is active. Shortcuts with no `scope` bind under
  `HotkeysConfig.defaultScope` (default `'all'`, which fires regardless of the
  active scope). The active scope is set from `defaultScope` at provider
  creation; the core interface exposes no runtime scope switch, so drive
  scoping through `defaultScope` + per-shortcut `scope`.
- `enable()`/`disable()` gate whether bound handlers run (the bindings stay
  attached, just suppressed). `getAll()` reflects the resulting `enabled`
  state; `isPressed(key)` reflects hotkeys-js's live key-state tracking.
- **Wire it** with `setProvider()` from `@molecule/app-keyboard-shortcuts` or
  `bond('keyboard-shortcuts', provider)` from `@molecule/app-bond` — both route
  through the shared registry.

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

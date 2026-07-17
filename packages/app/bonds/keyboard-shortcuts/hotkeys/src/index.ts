/**
 * Keyboard-shortcuts provider for `@molecule/app-keyboard-shortcuts`, backed by
 * the `hotkeys-js` library. This bond attaches real global key listeners:
 * **a registered `Shortcut.handler` fires on the actual keypress.**
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-keyboard-shortcuts-hotkeys'
 * import { setProvider } from '@molecule/app-keyboard-shortcuts'
 *
 * setProvider(provider)   // once, at app startup (bonds.ts)
 *
 * const unregister = provider.register({
 *   keys: 'ctrl+s',
 *   handler: () => save(),   // fires on Ctrl+S; preventDefault is automatic
 *   description: 'Save document',
 * })
 * // ...later, when the owning screen unmounts:
 * unregister()
 * ```
 *
 * @remarks
 * - **Handlers fire for real.** `register()` binds via `hotkeys(combo, handler)`;
 *   pressing the combo invokes `Shortcut.handler` with the real `KeyboardEvent`.
 *   `event.preventDefault()` is called automatically unless
 *   `Shortcut.preventDefault === false` — so a combo that collides with a browser
 *   default (Ctrl+S, Ctrl+P) suppresses the browser action.
 * - **Input guard is built in.** hotkeys-js's default `filter` does not fire while
 *   an `input`/`textarea`/`select`/`contenteditable` is focused, so typing never
 *   triggers shortcuts unless you opt in.
 * - **Scopes.** A `Shortcut.scope` binds under that hotkeys-js scope and fires
 *   only while that scope is active. Shortcuts with no `scope` bind under
 *   `HotkeysConfig.defaultScope` (default `'all'`, which fires regardless of the
 *   active scope). The active scope is set from `defaultScope` at provider
 *   creation; the core interface exposes no runtime scope switch, so drive
 *   scoping through `defaultScope` + per-shortcut `scope`.
 * - `enable()`/`disable()` gate whether bound handlers run (the bindings stay
 *   attached, just suppressed). `getAll()` reflects the resulting `enabled`
 *   state; `isPressed(key)` reflects hotkeys-js's live key-state tracking.
 * - **Wire with `setProvider()` from `@molecule/app-keyboard-shortcuts`** — the
 *   core keeps a module-local singleton; a generic
 *   `bond('keyboard-shortcuts', …)` silently no-ops.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

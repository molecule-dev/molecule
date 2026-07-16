/**
 * Keyboard-shortcuts provider for `@molecule/app-keyboard-shortcuts` — an
 * in-memory shortcut REGISTRY only. Despite the name, this bond does not use
 * the hotkeys-js library (no dependency) and attaches NO key event listener:
 * **registered handlers are never invoked by this bond.**
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-keyboard-shortcuts-hotkeys'
 * import { setProvider } from '@molecule/app-keyboard-shortcuts'
 *
 * setProvider(provider)   // once, at app startup (bonds.ts)
 *
 * // This bond only RECORDS shortcuts (for help overlays via getAll()).
 * // The app must own dispatch itself:
 * window.addEventListener('keydown', (e) => {
 *   const combo = [e.ctrlKey && 'ctrl', e.shiftKey && 'shift', e.key.toLowerCase()]
 *     .filter(Boolean).join('+')
 *   const match = provider.getAll().find((s) => s.enabled && s.keys === combo)
 *   // honor the input/textarea/contenteditable guard + preventDefault here
 * })
 * ```
 *
 * @remarks
 * - **This bond does NOT make shortcuts fire.** Nothing listens for `keydown`;
 *   `Shortcut.handler`, `preventDefault`, and `scope` are stored but ignored,
 *   and `isPressed()` always returns `false`. The app must own the keydown
 *   listener, combo matching, `preventDefault`, and the
 *   input/textarea/contenteditable guard — honoring `enable()`/`disable()` and
 *   per-shortcut `enabled` from `getAll()`.
 * - `HotkeysConfig.defaultScope` is currently INERT; only `enabled` is honored.
 * - **Wire with `setProvider()` from `@molecule/app-keyboard-shortcuts`** — the
 *   core keeps a module-local singleton; a generic
 *   `bond('keyboard-shortcuts', …)` silently no-ops.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

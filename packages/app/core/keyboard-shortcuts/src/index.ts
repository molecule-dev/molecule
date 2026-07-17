/**
 * Keyboard shortcuts core interface for molecule.dev.
 *
 * Provides a standardized API for registering and managing keyboard
 * shortcuts across the application. Bond a provider
 * (e.g. `@molecule/app-keyboard-shortcuts-hotkeys`) to supply
 * the concrete implementation.
 *
 * @remarks
 * - **Wire with THIS package's `setProvider()` or `bond('keyboard-shortcuts', …)`**
 *   (e.g. the `provider` export of `@molecule/app-keyboard-shortcuts-hotkeys`) once at
 *   startup — `setProvider()` delegates into the shared `@molecule/app-bond` registry,
 *   so both write the same slot; `requireProvider()` throws until one has run.
 * - **The bonded provider owns the actual key event binding** (global
 *   `keydown`/`keyup` listeners, combo matching, `preventDefault` per the
 *   `Shortcut.preventDefault` flag, and not firing while an
 *   input/textarea/contenteditable has focus). After wiring, PRESS a registered
 *   combo and confirm the real action runs — a registry that accepts `register()`
 *   calls but never fires handlers is an integration bug to fix, not to skip.
 * - `register()` returns an unregister function — call it when the owning
 *   screen/component unmounts, or stale shortcuts ghost-fire elsewhere.
 * - Shortcut `description`s surface in help overlays: pass them through
 *   `t('key', values, { defaultValue })`.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-keyboard-shortcuts'
 *
 * const shortcuts = requireProvider()
 * const unregister = shortcuts.register({
 *   keys: 'ctrl+s',
 *   handler: (e) => { e.preventDefault(); save() },
 *   description: 'Save document',
 * })
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Every shortcut this app registers triggers its REAL action (find them
 *   in the app's shortcut help/registration, then press each one).
 * - [ ] Shortcuts that collide with browser defaults (e.g. Ctrl+S) run the app
 *   action and suppress the browser behavior (no save dialog).
 * - [ ] Shortcuts do NOT fire while typing in an input/textarea/contenteditable
 *   unless the shortcut is deliberately global.
 * - [ ] Navigating away from a screen unregisters its shortcuts — pressing them
 *   elsewhere causes no ghost actions.
 * - [ ] If a shortcuts help overlay exists, it lists the shortcuts that are
 *   actually registered (no phantom or missing entries).
 */

export * from './provider.js'
export * from './types.js'

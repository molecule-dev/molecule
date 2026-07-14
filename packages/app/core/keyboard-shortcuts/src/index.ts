/**
 * Keyboard shortcuts core interface for molecule.dev.
 *
 * Provides a standardized API for registering and managing keyboard
 * shortcuts across the application. Bond a provider
 * (e.g. `@molecule/app-keyboard-shortcuts-hotkeys`) to supply
 * the concrete implementation.
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

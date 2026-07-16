/**
 * On-screen (software) keyboard handling interface for molecule.dev.
 *
 * Framework-agnostic core for managing the mobile soft keyboard through a
 * swappable `KeyboardProvider`: hide/show, visibility + height state,
 * show/hide/height-change events, resize behavior, and DOM helpers
 * (`hideOnOutsideClick`, `createKeyboardAwareContainer`).
 *
 * This is NOT hotkeys/shortcuts — for desktop keyboard shortcuts use
 * `@molecule/app-keyboard-shortcuts`.
 *
 * @example
 * ```typescript
 * import {
 *   getCapabilities,
 *   hasProvider,
 *   hide,
 *   onShow,
 *   onHide,
 * } from '@molecule/app-keyboard'
 *
 * function wireKeyboardAwareFooter(setPadding: (px: number) => void): () => void {
 *   if (!hasProvider()) return () => {} // web/desktop: no soft keyboard
 *   const offShow = onShow((e) => setPadding(e.keyboardHeight))
 *   const offHide = onHide(() => setPadding(0))
 *   return () => {
 *     offShow()
 *     offHide()
 *   }
 * }
 *
 * async function submitAndDismiss(): Promise<void> {
 *   if (hasProvider()) await hide()
 * }
 * ```
 *
 * @remarks
 * - **Every accessor THROWS until `setProvider()` is called.** The one
 *   prebuilt bond is `@molecule/app-keyboard-react-native`; **web has no
 *   bond** — browsers expose no soft-keyboard API (focus/blur inputs
 *   instead), so on web leave this unwired and gate on `hasProvider()`.
 * - **Do not assume the full surface works on any given provider** — check
 *   `getCapabilities()` first. Notably, the react-native bond's `show()` is
 *   a NO-OP (platforms can't summon the keyboard programmatically — focus a
 *   text input instead) and its `setResizeMode`/`setStyle`/
 *   `setAccessoryBar`/`setScroll` are no-ops configured natively at build
 *   time; it reports all of these `false` in capabilities.
 * - Event subscriptions (`onShow`/`onHide`/`onHeightChange`) return
 *   unsubscribe functions — always call them on unmount or listeners leak
 *   across screens.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'

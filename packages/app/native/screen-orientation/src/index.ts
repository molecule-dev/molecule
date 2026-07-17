/**
 * Screen orientation interface for molecule.dev.
 *
 * Framework-agnostic core for reading and locking display orientation
 * through a swappable `ScreenOrientationProvider`: current state
 * (`getOrientation`, `getState`, `getDimensions`), locking (`lock`,
 * `lockPortrait`, `lockLandscape`, `lockCurrent`, `unlock`, `isLocked`),
 * and change events (`onChange`).
 *
 * @example
 * ```typescript
 * import {
 *   getCapabilities,
 *   hasProvider,
 *   lockLandscape,
 *   onChange,
 *   unlock,
 * } from '@molecule/app-screen-orientation'
 *
 * async function enterVideoFullscreen(): Promise<() => Promise<void>> {
 *   if (!hasProvider()) return async () => {}
 *   const caps = await getCapabilities()
 *   if (caps.canLock) await lockLandscape()
 *   return async () => {
 *     if (caps.canLock) await unlock()
 *   }
 * }
 *
 * function reactToRotation(cb: (o: string) => void): () => void {
 *   return onChange((event) => cb(event.current))
 * }
 * ```
 *
 * @remarks
 * - **Every accessor THROWS until `setProvider()` is called** — **no
 *   prebuilt provider package ships with molecule**; supply a
 *   `ScreenOrientationProvider` from your native runtime (or a web one over
 *   the Screen Orientation API).
 * - **Wiring:** this core delegates to the shared `@molecule/app-bond`
 *   registry, so `setProvider(provider)` and `bond('screen-orientation',
 *   provider)` write the same slot — use either.
 * - On web, `screen.orientation.lock()` generally requires FULLSCREEN first
 *   (and is rejected on most desktops); iOS Safari doesn't support locking
 *   at all. Treat locking as best-effort: check `getCapabilities().canLock`
 *   and design layouts that survive rotation anyway.
 * - Locking is a per-screen concern — always `unlock()` when leaving the
 *   screen that locked.
 *
 * @module
 */

export * from './orientation.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'

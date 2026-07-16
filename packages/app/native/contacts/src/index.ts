/**
 * Contacts / address-book access interface for molecule.dev.
 *
 * Framework-agnostic core for reading, searching, creating, updating,
 * deleting, and picking device contacts through a swappable
 * `ContactsProvider`, plus pure helpers (`formatDisplayName`,
 * `getPrimaryPhone`, `getPrimaryEmail`, `formatPhoneNumber`, `getInitials`)
 * that work on `Contact` objects from any provider.
 *
 * @example
 * ```typescript
 * import {
 *   getAll,
 *   getPermissionStatus,
 *   hasProvider,
 *   pick,
 *   requestPermission,
 *   formatDisplayName,
 * } from '@molecule/app-contacts'
 *
 * async function importContacts(): Promise<string[]> {
 *   if (!hasProvider()) return [] // no provider wired — feature-gate the UI
 *   if ((await getPermissionStatus()) !== 'granted') {
 *     const status = await requestPermission() // from a user gesture
 *     if (status !== 'granted') return []
 *   }
 *   const contacts = await getAll({ sortBy: 'name' })
 *   return contacts.map((c) => formatDisplayName(c))
 * }
 *
 * async function pickOne(): Promise<void> {
 *   const [selected] = await pick({ multiple: false })
 *   if (selected) console.log(formatDisplayName(selected))
 * }
 * ```
 *
 * @remarks
 * - **Every accessor THROWS until `setProvider()` is called** — there is no
 *   web fallback and **no prebuilt provider package ships with molecule**
 *   (contacts access needs a native container). Gate all contact UI behind
 *   `hasProvider()` and supply your own `ContactsProvider` from your native
 *   runtime.
 * - **Browsers have no general address-book API.** Do not "fall back to web":
 *   the closest thing (Contact Picker API) is Chromium-on-Android only,
 *   read-only, picker-only — `getAll`/`create`/`update`/`delete` cannot be
 *   implemented on web at all.
 * - **Request permission from a user gesture at the point of use** and handle
 *   `'denied'`/`'limited'` — a denied OS prompt is remembered; recovery is
 *   `openSettings()`, not another `requestPermission()` call.
 * - Check `getCapabilities()` before offering write features: iOS supports
 *   `'limited'` access where only a subset of contacts is visible.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'

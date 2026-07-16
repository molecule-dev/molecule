/**
 * NFC (near-field communication) interface for molecule.dev.
 *
 * Framework-agnostic core for reading and writing NFC tags through a
 * swappable `NfcProvider` — scan sessions (`startScan`, `scanOnce`), NDEF
 * writes (`write`, `erase`, `makeReadOnly`), availability/permission
 * checks — plus pure NDEF builders/parsers that need no provider
 * (`createTextRecord`, `createUriRecord`, `createMessage`, `getText`,
 * `getUri`, `writeText`, `writeUrl`, `formatTagId`).
 *
 * @example
 * ```typescript
 * import {
 *   createMessage,
 *   createUriRecord,
 *   hasProvider,
 *   isAvailable,
 *   scanOnce,
 *   write,
 * } from '@molecule/app-nfc'
 *
 * async function readTag(): Promise<string | null> {
 *   if (!hasProvider() || !(await isAvailable())) return null
 *   const tag = await scanOnce({ timeout: 30000 })
 *   return tag.id
 * }
 *
 * async function writeLink(url: string): Promise<void> {
 *   await write(createMessage(createUriRecord(url)))
 * }
 * ```
 *
 * @remarks
 * - **Every provider-backed call THROWS until `setProvider()` is called** —
 *   **no prebuilt provider package ships with molecule**; supply an
 *   `NfcProvider` from your native runtime. The pure NDEF helpers work
 *   anywhere.
 * - **Wiring exception:** this core keeps its provider in a module-local
 *   singleton — `bond('nfc', provider)` through `@molecule/app-bond` does
 *   NOT reach it and `validateBonds()` cannot check it. Use THIS package's
 *   `setProvider()`.
 * - Web support is narrow: Web NFC exists only in Chromium on Android, on
 *   HTTPS, from a user gesture — iOS browsers have none. Always gate the
 *   whole feature on `isAvailable()` + `isEnabled()` and offer a QR-code
 *   fallback for the same payload.
 * - `makeReadOnly()` is PERMANENT and `erase()` destroys tag content —
 *   confirm with the user first.
 *
 * @module
 */

export * from './ndef.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'

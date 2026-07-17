/**
 * Bluetooth Low Energy (BLE) interface for molecule.dev.
 *
 * Provides a unified API for BLE operations across platforms: scanning
 * (`startScan`/`scanOnce`), connections (`connect`/`disconnect`), GATT
 * service discovery, characteristic `read`/`write`/`startNotifications`,
 * adapter state, and permissions — plus byte helpers (`bufferToHex`,
 * `stringToBuffer`, `normalizeUuid`, …).
 *
 * @example
 * ```ts
 * import type { BluetoothProvider } from '@molecule/app-bluetooth'
 * import { setProvider, scanOnce, connect, read, bufferToString } from '@molecule/app-bluetooth'
 *
 * // No prebuilt provider bond ships yet — supply your platform implementation
 * // (web: navigator.bluetooth, Chromium-only; native: the platform BLE stack).
 * const myBleProvider = {} as BluetoothProvider // stand-in for your implementation
 * setProvider(myBleProvider)
 *
 * const devices = await scanOnce({ timeout: 5000 })
 * if (devices[0]) {
 *   await connect(devices[0].id)
 *   const value = await read(devices[0].id, 'battery_service', 'battery_level')
 *   console.log(bufferToString(value))
 * }
 * ```
 *
 * @remarks
 * - **Wire with `setProvider()` or `bond('bluetooth', provider)`** — this core delegates to the
 *   shared `@molecule/app-bond` registry, so both write the same slot.
 * - **No prebuilt provider bond exists for this interface yet** — implement
 *   `BluetoothProvider` yourself. Ignore any runtime error text suggesting a `-capacitor`
 *   package; none ships.
 * - Web Bluetooth is Chromium-only, requires HTTPS AND a user gesture per device request, and
 *   cannot free-scan in the background — expect a chooser UI, not a silent device list. Check
 *   `getPermissionStatus()`/`isEnabled()` and design a manual "connect" flow.
 * - Always stop scans and disconnect when done — an open scan drains battery on both ends.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'

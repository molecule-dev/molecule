/**
 * Accelerometer and gyroscope interface for molecule.dev.
 *
 * Framework-agnostic core for motion sensors through a swappable
 * `MotionProvider`: continuous streams (`startAccelerometer`,
 * `startGyroscope`, `startMagnetometer`, `startOrientation`,
 * `startMotion`), one-off reads (`getAccelerometer`, `getGyroscope`,
 * `getOrientation`), a permission flow, and pure gesture helpers
 * (`createShakeDetector`, `createTiltDetector`, `createStepCounter`,
 * vector math).
 *
 * @example
 * ```typescript
 * import {
 *   createShakeDetector,
 *   getAccelerometer,
 *   hasProvider,
 *   requestPermission,
 * } from '@molecule/app-motion'
 *
 * async function undoOnShake(undo: () => void): Promise<() => void> {
 *   if (!hasProvider()) return () => {} // no provider wired — skip
 *   if ((await requestPermission()) !== 'granted') return () => {}
 *   const shake = createShakeDetector(undo) // self-wires the accelerometer
 *   shake.start()
 *   return () => shake.stop() // ALWAYS stop on unmount — sensors drain battery
 * }
 *
 * async function logTilt(): Promise<void> {
 *   const { x, y, z } = await getAccelerometer() // one-off read
 *   console.log(x, y, z)
 * }
 * ```
 *
 * @remarks
 * - **Every accessor THROWS until `setProvider()` is called** — there is no
 *   web fallback and **no prebuilt provider package ships with molecule**;
 *   supply a `MotionProvider` (native runtime, or a thin web one over
 *   `devicemotion`/`deviceorientation` events).
 * - **iOS WebKit requires `requestPermission()` from a USER GESTURE**
 *   (`DeviceMotionEvent.requestPermission`) on HTTPS — calling it on page
 *   load, or on http, rejects without a prompt. Desktop browsers simply
 *   have no sensors: treat `'unsupported'` as a normal outcome, not an
 *   error.
 * - Every `start*` returns a stop function — call it on unmount; a leaked
 *   60 Hz sensor stream is a battery drain and keeps the page from
 *   sleeping.
 * - Axes/units are normalized by the provider contract (m/s², rad/s), but
 *   `includesGravity` differs per source — check the flag on
 *   `AccelerometerData` before applying filters.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'

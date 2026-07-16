/**
 * Camera interface for molecule.dev.
 *
 * Provides a unified API for camera access that works across
 * different platforms (web, Capacitor, React Native, etc.).
 *
 * @example
 * ```ts
 * import { requestPermission, getPhoto, pickPhotos } from '@molecule/app-camera'
 *
 * // On web this works with ZERO wiring: a MediaDevices-based provider is
 * // auto-registered on first use (HTTPS/secure context required).
 * const permission = await requestPermission() // call from a user gesture
 * if (permission === 'granted') {
 *   const photo = await getPhoto({ quality: 80 })
 *   console.log(photo.webPath ?? photo.base64?.slice(0, 32))
 * } else {
 *   const fallback = await pickPhotos({ limit: 1 }) // gallery fallback on denial
 *   console.log(fallback.length)
 * }
 * ```
 *
 * @remarks
 * Camera access needs an OS/browser permission — get this right or the feature silently fails:
 *
 * - **Request permission at the point of use, from a user gesture** ({@link requestPermission}
 *   on a tap), NOT on load. A prompt the user doesn't expect gets denied, and a denied
 *   permission is REMEMBERED — you can't re-prompt, only send them to settings.
 * - **Check {@link checkPermission} first and handle denial gracefully** — offer a fallback
 *   (e.g. {@link pickPhotos} from the gallery, or a file upload) and explain how to re-enable;
 *   never leave the app stuck on a dead camera view.
 * - **Release the camera** with {@link stopPreview} when done (an open stream drains battery and
 *   holds the device).
 * - **A web (MediaDevices) provider is auto-registered on first use when none is set** — great
 *   in browsers (secure context required), but on React Native or other non-browser runtimes
 *   that auto-registered provider cannot work: there is currently NO prebuilt native bond, so on
 *   native implement `CameraProvider` over the platform camera API and call `setProvider()`
 *   BEFORE any call auto-bonds the web one.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './web-provider.js'

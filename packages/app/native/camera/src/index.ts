/**
 * Camera interface for molecule.dev.
 *
 * Provides a unified API for camera access that works across
 * different platforms (web, Capacitor, React Native, etc.).
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
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './web-provider.js'

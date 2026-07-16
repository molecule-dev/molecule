/**
 * Platform detection and abstraction for molecule.dev.
 *
 * Detects the current runtime (web, iOS, Android, Electron/desktop) by
 * inspecting Capacitor / Electron / React Native markers, and provides
 * platform-branching helpers ({@link onPlatform}, {@link isPlatform}) plus a
 * native-startup coordinator ({@link createCapacitorApp}). Pure functions —
 * no bond wiring required.
 *
 * @example
 * ```typescript
 * import { isPlatform, onPlatform, platform } from '@molecule/app-platform'
 *
 * const info = platform() // cached PlatformInfo
 * if (info.isNative) initNativePlugins()
 *
 * const label = onPlatform({
 *   ios: () => 'App Store',
 *   android: () => 'Play Store',
 *   default: () => 'Web', // `default` is required — always a fallback
 * })
 * ```
 *
 * @remarks
 * - **A mobile BROWSER is `'web'`, not `'ios'`/`'android'`.** `isMobile` means
 *   "running as a native mobile app" — Safari on an iPhone reports
 *   `platform: 'web'`, `isMobile: false`. Use CSS media queries / viewport
 *   checks for responsive layout; use this package only for CAPABILITY
 *   branching (native plugins, file paths, store links, push setup).
 * - **Branch through {@link onPlatform}/{@link isPlatform}, never by parsing
 *   `navigator.userAgent` yourself** — hand-rolled UA sniffing is exactly what
 *   this package exists to replace.
 * - {@link platform} caches after the first call; call
 *   {@link resetPlatformCache} in tests or when the runtime context changes.
 *
 * @module
 */

export * from './capacitor.js'
export * from './detection.js'
export * from './provider.js'
export * from './types.js'

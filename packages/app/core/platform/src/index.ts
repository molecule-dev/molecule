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
 * const info = platform() // detected once, then cached
 *
 * const storeUrl = onPlatform({
 *   ios: () => 'https://apps.apple.com/app/id000000000',
 *   android: () => 'https://play.google.com/store/apps/details?id=dev.example.app',
 *   default: () => '/download', // `default` is required — always a fallback
 * })
 *
 * const showInstallBanner = info.isWeb // true in any browser, including mobile Safari
 * const canUseNativeShare = isPlatform('ios', 'android') // native app shells only
 *
 * console.log(info.platform, storeUrl, showInstallBanner, canUseNativeShare)
 * // browser: 'web' '/download' true false — Capacitor iOS shell: 'ios' 'https://apps.apple.com/…' false true
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

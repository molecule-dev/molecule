/**
 * NativeWind UIClassMap bond for React Native.
 *
 * Extends the Tailwind classmap with overrides for classes that are
 * unsupported or behave differently in NativeWind / React Native.
 *
 * @example
 * ```typescript
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-nativewind'
 *
 * setClassMap(classMap) // once, at app startup
 * ```
 *
 * @remarks
 * - This package emits Tailwind class STRINGS — the host React Native app must
 *   have NativeWind v4 configured (babel preset + `tailwind.config` whose
 *   `content` globs include your source AND
 *   `node_modules/@molecule/app-ui-nativewind/dist` +
 *   `node_modules/@molecule/app-ui-tailwind/dist`). `nativewind` itself is NOT
 *   a dependency of this package.
 * - NativeWind v4 supports ~90% of Tailwind CSS; this classmap's overrides
 *   absorb the gaps: no CSS grid (`grid()` approximates with flex-wrap), no
 *   `hover:` (touch uses `active:`), no `backdrop-blur`, no CSS
 *   transitions/animations (use RN Animated/Reanimated), no `position: fixed`,
 *   no portals (RN `Modal` handles overlays), no `cursor-pointer`, no `prose`.
 *   Don't hand-write these utilities in RN app code — go through `getClassMap()`.
 *
 * @module
 */

export { classMap } from './classMap.js'

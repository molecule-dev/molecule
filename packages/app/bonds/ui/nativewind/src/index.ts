/**
 * NativeWind UIClassMap bond for React Native.
 *
 * Extends the Tailwind classmap with overrides for classes that are
 * unsupported or behave differently in NativeWind / React Native.
 *
 * @example
 * ```typescript
 * import { getClassMap, setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-nativewind'
 *
 * // Startup (App.tsx / bonds.ts): bond once, before the first screen renders.
 * setClassMap(classMap)
 *
 * // A component resolves its tokens through getClassMap() and hands them to
 * // NativeWind's `className` prop:
 * //   <View className={styles.grid}>
 * //     <Pressable className={styles.tile}><Text className={styles.title}>{name}</Text></Pressable>
 * //   </View>
 * export function photoGridStyles(): { grid: string; tile: string; title: string; link: string } {
 *   const cm = getClassMap()
 *   return {
 *     grid: cm.grid({ cols: 2, gap: 'md' }), // RN has no CSS grid → flex-row flex-wrap
 *     tile: cm.card(),
 *     title: cm.cardTitle,
 *     link: cm.link, // active: (touch) instead of hover:
 *   }
 * }
 *
 * const styles = photoGridStyles()
 * console.log(styles.grid) // 'flex flex-row flex-wrap gap-4'
 * ```
 *
 * @remarks
 * - Bond THIS classMap in React Native, not `@molecule/app-ui-tailwind`'s —
 *   the web map emits CSS grid / `hover:` / `backdrop-blur` classes NativeWind
 *   cannot apply. `getClassMap()` throws until `setClassMap()` has run.
 * - `grid({ cols })` does NOT size columns (it returns flex-wrap only): give
 *   each tile its own width (e.g. `cm.w(...)`) for a real 2-column layout.
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

export * from './classMap.js'

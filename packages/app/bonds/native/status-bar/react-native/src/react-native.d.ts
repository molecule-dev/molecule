/**
 * Minimal type declarations for the react-native peer used by this package.
 *
 * The real types ship with `react-native` itself. However, `react-native`'s entry
 * point uses Flow syntax that Vite/Rollup/Node.js cannot parse, so installing it
 * in a non-RN workspace breaks Vitest across every package that mocks it. This
 * stub provides the subset we need for compilation; the real types take over when
 * the package is consumed in an actual React Native project.
 *
 * @module
 */

declare module 'react-native' {
  /** Minimal shape of the react-native StatusBar static API used by this package. */
  export interface StatusBarStatic {
    setBarStyle(style: string, animated?: boolean): void
    setBackgroundColor(color: string, animated?: boolean): void
    setHidden(hidden: boolean, animation?: string): void
    setTranslucent(translucent: boolean): void
    currentHeight?: number
  }

  export const StatusBar: StatusBarStatic
}

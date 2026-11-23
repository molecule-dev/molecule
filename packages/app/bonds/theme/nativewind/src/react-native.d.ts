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
  /** The device's appearance setting (light or dark). */
  export const Appearance: {
    /** The current setting; `null` or `undefined` when the platform has none. */
    getColorScheme(): 'light' | 'dark' | null | undefined
    /** Calls back whenever the setting changes. */
    addChangeListener(
      listener: (preferences: { colorScheme: 'light' | 'dark' | null | undefined }) => void,
    ): {
      remove(): void
    }
  }

  /** The part of react-native's StyleSheet that NativeWind's types extend. */
  export const StyleSheet: {
    /** Flattens a style array into one object. */
    flatten(style: unknown): Record<string, unknown>
  }
}

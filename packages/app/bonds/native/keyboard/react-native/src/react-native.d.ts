/**
 * Minimal type declarations for react-native primitives used by this package.
 *
 * The real types ship with `react-native` itself (bundled since v0.71 — there is
 * no separate `@types/react-native` on npm). However, `react-native`'s entry
 * point uses Flow syntax that Vite/Rollup/Node.js cannot parse, so installing it
 * in a non-RN workspace breaks Vitest across every package that mocks it. This
 * stub provides the subset we need for compilation; the real types take over when
 * the package is consumed in an actual React Native project.
 *
 * @module
 */

declare module 'react-native' {
  /** Minimal shape of the react-native Keyboard module used by this package. */
  export interface Keyboard {
    dismiss(): void
    addListener(
      event: string,
      callback: (e: { endCoordinates?: { height?: number }; duration?: number }) => void,
    ): { remove(): void }
  }

  /** Minimal shape of the react-native Dimensions module used by this package. */
  export interface Dimensions {
    get(dim: string): { height: number; width: number }
  }

  export const Keyboard: Keyboard
  export const Dimensions: Dimensions
}

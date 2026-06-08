/**
 * Minimal type declarations for the react-native peer used by this package.
 *
 * The real types ship with `react-native` itself (bundled since v0.71). However,
 * `react-native`'s entry point uses Flow syntax that Vite/Rollup/Node.js cannot
 * parse, so installing it in a non-RN workspace breaks Vitest across every package
 * that imports it. This stub provides the subset we need for compilation; the real
 * types take over when the package is consumed in an actual React Native project.
 *
 * @module
 */

declare module 'react-native' {
  export const AppState: {
    currentState: string
    addEventListener: (type: string, handler: (state: string) => void) => { remove: () => void }
  }

  export const Linking: {
    addEventListener: (
      type: string,
      handler: (event: { url: string }) => void,
    ) => { remove: () => void }
    getInitialURL: () => Promise<string | null>
  }
}

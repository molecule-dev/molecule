/**
 * Minimal type declarations for react-native primitives used by this package.
 *
 * react-native's entry point uses Flow syntax that Vite/Rollup/Node.js cannot
 * parse, so installing it in a non-RN workspace breaks Vitest across every
 * package that imports it. This stub provides only the Platform API subset
 * used here; the real types take over when the package is consumed inside an
 * actual React Native project.
 *
 * @module
 */

declare module 'react-native' {
  /** Platform detection utilities. */
  export const Platform: {
    /** The current platform identifier. */
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos'
  }
}

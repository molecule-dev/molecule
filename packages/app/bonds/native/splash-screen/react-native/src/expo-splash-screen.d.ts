/**
 * Minimal type declarations for expo-splash-screen primitives used by this package.
 *
 * expo-splash-screen is a peer dependency loaded at runtime in an Expo/React Native
 * project. Installing it in the molecule workspace would pull in Flow-syntax entry
 * points that break Vitest across the monorepo. This stub types the subset the
 * package actually uses; the real types take over when consumed in an Expo project.
 *
 * @module
 */

declare module 'expo-splash-screen' {
  /** Prevents the splash screen from auto-hiding. Returns true when successful. */
  export function preventAutoHideAsync(): Promise<boolean>

  /** Hides the splash screen. Returns true when successful. */
  export function hideAsync(): Promise<boolean>
}

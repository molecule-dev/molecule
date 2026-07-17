/**
 * Minimal type declarations for expo-constants used by this package.
 *
 * expo-constants is an optional peer loaded at runtime in a React Native /
 * Expo environment to read the EAS `projectId` baked into the app config. It is
 * not installed in this workspace, so this ambient declaration provides only the
 * subset the provider reads; the real types take over when the package is
 * consumed inside an actual Expo project.
 *
 * @module
 */

declare module 'expo-constants' {
  /** Minimal shape of the Expo runtime constants used by this package. */
  interface ExpoConstants {
    /** The resolved Expo app config (from `app.json`/`app.config`). */
    expoConfig?: {
      extra?: {
        eas?: {
          projectId?: string
        }
      }
    } | null
    /** EAS build config, when present. */
    easConfig?: {
      projectId?: string
    } | null
  }

  const Constants: ExpoConstants
  export default Constants
}

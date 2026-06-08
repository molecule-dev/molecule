/**
 * Minimal ambient type declarations for `@react-native-async-storage/async-storage`.
 *
 * The real types ship with the package itself, but it is declared as an optional
 * peerDependency and is never installed in this non-React-Native workspace (installing
 * it would pull in Flow-syntax entry points that break Vitest). This stub covers the
 * subset of the API actually used by provider.ts; the real types take over when the
 * package is consumed inside a React Native project.
 *
 * @module
 */

declare module '@react-native-async-storage/async-storage' {
  /** The subset of AsyncStorage's API used by this package. */
  interface AsyncStorageStatic {
    getItem(key: string): Promise<string | null>
    setItem(key: string, value: string): Promise<void>
    removeItem(key: string): Promise<void>
    getAllKeys(): Promise<readonly string[]>
    multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]>
    multiSet(pairs: readonly [string, string][]): Promise<void>
    multiRemove(keys: readonly string[]): Promise<void>
    clear(): Promise<void>
  }

  const AsyncStorage: AsyncStorageStatic
  export default AsyncStorage
}

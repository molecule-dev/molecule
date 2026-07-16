/**
 * React Native framework bindings for molecule.dev.
 *
 * Re-exports every hook and provider from `@molecule/app-react` (they are pure
 * React — no DOM dependency) and adds RN-specific hooks: `useAppState`
 * (foreground/background), `useBackHandler` (Android back button),
 * `useKeyboardHeight`, and `useSafeArea`.
 *
 * @example
 * ```tsx
 * import { MoleculeProvider, useAuth, useAppState, useSafeArea } from '@molecule/app-react-native'
 * import { SafeAreaProvider } from 'react-native-safe-area-context'
 * import { View } from 'react-native'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 *
 * const authClient = createJWTAuthClient({ baseURL: 'https://api.example.com' })
 *
 * function Shell() {
 *   const { isAuthenticated } = useAuth()
 *   const { isActive } = useAppState()
 *   const insets = useSafeArea()
 *   return (
 *     <View style={{ paddingTop: insets.top }}>
 *       {isAuthenticated && isActive ? <View /> : null}
 *     </View>
 *   )
 * }
 *
 * function App() {
 *   return (
 *     <SafeAreaProvider>
 *       <MoleculeProvider state={stateProvider} auth={authClient}>
 *         <Shell />
 *       </MoleculeProvider>
 *     </SafeAreaProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **The re-exported hooks keep `@molecule/app-react`'s contract**: each one throws unless its
 *   provider was passed to `MoleculeProvider` (or mounted individually). See the
 *   `@molecule/app-react` docs for the hook→provider map.
 * - **`useSafeArea` needs `SafeAreaProvider`** (from `react-native-safe-area-context`) mounted at
 *   the root; without it — or without the library installed — it silently returns zero insets
 *   rather than throwing, so a notch-overlapped header means missing provider, not a bug in the hook.
 * - `useBackHandler` only fires on Android; iOS has no hardware back button.
 * - For components/styling pair this with `@molecule/app-ui-react-native`, whose ClassMap
 *   styling requires the NativeWind setup (`@molecule/app-ui-nativewind`) — see that package's docs.
 *
 * @module
 */

// Re-export everything from @molecule/app-react — all hooks are RN-compatible
export * from '@molecule/app-react'

// RN-specific hooks
export { useAppState } from './hooks/useAppState.js'
export { useBackHandler } from './hooks/useBackHandler.js'
export { useKeyboardHeight } from './hooks/useKeyboardHeight.js'
export { useSafeArea } from './hooks/useSafeArea.js'

// RN-specific types
export type { UseAppStateResult, UseBackHandlerOptions, UseKeyboardHeightResult } from './types.js'

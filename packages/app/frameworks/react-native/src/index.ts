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
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { MoleculeProvider, useAppState, useAuth, useSafeArea, useTranslation } from '@molecule/app-react-native'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-nativewind'
 * import { Alert, Container } from '@molecule/app-ui-react-native'
 *
 * // Once at startup, before the first render.
 * setClassMap(classMap)
 * registerLocaleModule(commonLocales) // translations for the `auth.*` keys below
 *
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * const authClient = createJWTAuthClient<User>({ baseURL: 'https://api.example.com' })
 *
 * function HomeScreen() {
 *   const { user, isAuthenticated } = useAuth<User>()
 *   const { isActive } = useAppState()
 *   const insets = useSafeArea()
 *   const { t } = useTranslation()
 *
 *   return (
 *     <Container style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
 *       <Alert status={isActive ? 'info' : 'warning'}>
 *         {isAuthenticated
 *           ? t('auth.modal.loggedInAs', { who: user?.name ?? '' }, { defaultValue: 'Logged in as {{who}}' })
 *           : t('auth.login.logIn', undefined, { defaultValue: 'Log in' })}
 *       </Alert>
 *     </Container>
 *   )
 * }
 *
 * // Register as the root component. Wrap it in `<SafeAreaProvider>` from
 * // `react-native-safe-area-context` in the real app, or the insets stay 0.
 * export function App() {
 *   return (
 *     <MoleculeProvider state={stateProvider} auth={authClient} i18n={getI18nProvider()}>
 *       <HomeScreen />
 *     </MoleculeProvider>
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
 * - `useAppState()` reports `'active'` (and `isActive: true`) wherever `react-native`'s
 *   `AppState` is unavailable (web, tests) — it never throws, so it cannot detect a missing RN.
 * - **Not a component library.** This package ships hooks + providers only; the UI in the
 *   example comes from `@molecule/app-ui-react-native`.
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

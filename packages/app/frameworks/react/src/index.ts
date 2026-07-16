/**
 * React framework bindings for the Molecule app stack.
 *
 * Provides React hooks, contexts, and provider components for all molecule
 * core interfaces (auth, i18n, theme, routing, state, http, storage, logger,
 * chat, workspace, editor, preview), so framework-agnostic providers plug
 * into React idioms.
 *
 * @example
 * ```tsx
 * import { MoleculeProvider, useAuth, useTheme, useTranslation } from '@molecule/app-react'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 * import { provider as i18nProvider } from '@molecule/app-i18n-react-i18next'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 *
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 *
 * function Dashboard() {
 *   const { user, isAuthenticated, logout } = useAuth<{ name?: string }>()
 *   const { t } = useTranslation()
 *   const { theme, toggleTheme } = useTheme()
 *
 *   if (!isAuthenticated) {
 *     return <p>{t('auth.required', undefined, { defaultValue: 'Please log in.' })}</p>
 *   }
 *   return (
 *     <div style={{ background: theme.colors.background }}>
 *       <h1>{t('greeting.welcome', { name: user?.name }, { defaultValue: 'Welcome, {{name}}!' })}</h1>
 *       <button onClick={toggleTheme}>{t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })}</button>
 *       <button onClick={() => logout()}>{t('auth.logout', undefined, { defaultValue: 'Log out' })}</button>
 *     </div>
 *   )
 * }
 *
 * function App() {
 *   return (
 *     <MoleculeProvider
 *       state={stateProvider}
 *       auth={authClient}
 *       theme={themeProvider}
 *       i18n={i18nProvider}
 *     >
 *       <Dashboard />
 *     </MoleculeProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Every hook throws when its provider is not mounted.** `MoleculeProvider` wires ONLY the
 *   services you pass as props — it is a convenience wrapper, not a default registry. The map:
 *   `useAuth`→`auth`, `useTranslation`/`useT`→`i18n`, `useTheme`→`theme`, `useRouter`→`router`,
 *   `useStore`→`state`, `useHttp`→`http`, `useStorage`→`storage`, `useLogger`→`logger`,
 *   `useChat`→`chat`, `useWorkspace`→`workspace`, `useEditor`→`editor`, `usePreview`→`preview`.
 *   "useXProvider must be used within an XProvider" means the matching prop (or individual
 *   provider component) is missing ABOVE the component that calls the hook — fix the wiring,
 *   never wrap the hook in try/catch.
 * - **Locale-reactive text requires the hook.** Inside components always read `t` from
 *   `useTranslation()` (or `useT()`); it re-renders on `onLocaleChange` — even when
 *   `addTranslations()` only adds keys for the current locale. Calling the raw `t()` import from
 *   `@molecule/app-i18n` in render works once but leaves stale text after a locale switch.
 * - **Exactly one React copy.** In workspace/symlinked dev setups a second React instance makes
 *   every hook fail ("Invalid hook call", or the provider errors above with the provider
 *   mounted). Scaffolded Vite configs ship
 *   `resolve.dedupe: ['react', 'react-dom', 'react-router-dom', 'react-router']` — keep it, and
 *   add any new hook-bearing peer library there too.
 * - `RouterProvider` carries a molecule `Router` (e.g. `createReactRouter()` from
 *   `@molecule/app-routing-react-router`). react-router's own `<BrowserRouter>` context is
 *   separate — components that render react-router `<Link>` (several in
 *   `@molecule/app-ui-react`) need it in addition to the molecule providers.
 *
 * @module
 */

export * from './agent-identity.js'
export * from './contexts.js'
export * from './hooks/index.js'
export * from './providers.js'
export * from './types.js'

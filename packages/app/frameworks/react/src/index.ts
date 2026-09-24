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
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { MoleculeProvider, useAuth, useStore, useTheme, useTranslation } from '@molecule/app-react'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * // Create clients/stores ONCE at module scope, never inside a component.
 * registerLocaleModule(commonLocales) // translations for the `common.*` / `auth.*` keys below
 * const authClient = createJWTAuthClient<User>({ baseURL: '/api' })
 * const inbox = stateProvider.createStore({ initialState: { unread: 3 } })
 *
 * function Dashboard() {
 *   const { user, isAuthenticated } = useAuth<User>()
 *   const { t } = useTranslation()
 *   const { mode, toggleTheme } = useTheme()
 *   const unread = useStore(inbox, { selector: (state) => state.unread })
 *
 *   return (
 *     <main data-theme={mode}>
 *       <h1>
 *         {isAuthenticated
 *           ? t('auth.modal.loggedInAs', { who: user?.name ?? '' }, { defaultValue: 'Logged in as {{who}}' })
 *           : t('auth.login.logIn', undefined, { defaultValue: 'Log in' })}
 *       </h1>
 *       <p>{t('common.countUnread', { count: unread }, { defaultValue: '{{count}} unread' })}</p>
 *       <button onClick={() => inbox.setState({ unread: 0 })}>
 *         {t('common.markAllRead', undefined, { defaultValue: 'Mark all read' })}
 *       </button>
 *       <button onClick={toggleTheme}>{t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })}</button>
 *     </main>
 *   )
 * }
 *
 * export function App() {
 *   return (
 *     <MoleculeProvider state={stateProvider} auth={authClient} theme={themeProvider} i18n={getI18nProvider()}>
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
 * - **`useStore(store, { selector })` takes a `Store` instance, not the provider.** Create it
 *   once at module scope (`stateProvider.createStore({ initialState })`, or `createStore()` from
 *   `@molecule/app-state` after its `setProvider()`); creating it inside a component makes a
 *   fresh, empty store on every render.
 * - `createJWTAuthClient<User>()` requires `User` to extend `UserProfile` (it must have `id`).
 * - **Locale-reactive text requires the hook.** Inside components always read `t` from
 *   `useTranslation()` (or `useT()`); it re-renders on `onLocaleChange` — even when
 *   `addTranslations()` only adds keys for the current locale. Calling the raw `t()` import from
 *   `@molecule/app-i18n` in render works once but leaves stale text after a locale switch.
 * - **Exactly one React copy.** In workspace/symlinked dev setups a second React instance makes
 *   every hook fail ("Invalid hook call", or the provider errors above with the provider
 *   mounted). Scaffolded Vite configs ship
 *   `resolve.dedupe: ['react', 'react-dom', 'react-router', 'react-router']` — keep it, and
 *   add any new hook-bearing peer library there too.
 * - **A payment provider's post-checkout redirect must land on the APP, and the page it
 *   lands on has to finish the purchase.** `useVerifyPaymentReturn()` reads the id the
 *   provider left in the query and confirms it with
 *   `POST /users/:id/verify-payment/:provider` — a same-origin call, so the session cookie
 *   applies. Redirecting straight to that API route from the provider's domain sends a
 *   top-level navigation with NO credentials: it answers 401 and the paid plan is never
 *   granted. The shipped confirmation pages (`@molecule/app-plan-updated-page-react`,
 *   `@molecule/app-legal-pages-react`) already call it.
 * - **A limit error from `useChat` carries the backend's remedy, not just its name.**
 *   `errorMeta` exposes `limitType` (the rule that fired), `requiresSignup`,
 *   `billingAction` (what the user must DO — e.g. `add_funds`,
 *   `add_payment_method`, `raise_spend_cap`, `upgrade`, `none`) and `upgradeTier`
 *   (`null` = no higher plan). Build the call-to-action from `billingAction`;
 *   deriving it from `limitType` alone offers "Upgrade" to someone who just needs
 *   to add funds. Whatever your API omits arrives `undefined`.
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

/**
 * React framework bindings for the Molecule app stack.
 *
 * Provides React hooks, contexts, and provider components for all molecule
 * core interfaces (auth, i18n, theme, routing, state, http, storage, logger,
 * chat, workspace, editor, preview), so framework-agnostic providers plug
 * into React idioms.
 *
 * **Editable account/profile forms:** `useProfileForm` composes the bonded form
 * and auth clients. It hydrates asynchronous user data without erasing dirty
 * fields, uses session ownership independently of editable profile identity,
 * snapshots controlled values on native form submission, submits only
 * changed fields through an app-supplied adapter, and persists/publishes the
 * server's saved user. Use its `onSaved` callback to update other query caches
 * from that response before navigating. Configure the endpoint, method and JSON
 * envelope once in `AuthClientConfig`; no page-local session store is needed.
 *
 * @example
 * ```tsx
 * const profile = useProfileForm<User, { name: string; email: string }>({
 *   defaultValues: { name: '', email: '' },
 *   toValues: (user) => ({ name: user.name ?? '', email: user.email ?? '' }),
 *   toPatch: (changes) => changes,
 *   onSaved: async (user) => {
 *     // Set/invalidate the app's profile query keys using the saved response.
 *     // Navigate only after those writes complete.
 *   },
 * })
 * <form {...profile.formProps}>
 *   <input {...profile.register('name')} />
 *   <input {...profile.register('email', { email: true })} type="email" />
 *   <button type="submit" disabled={!profile.ready || profile.isSubmitting}>Save</button>
 * </form>
 * ```
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
 * - `useProfileForm` needs `AuthProvider` (or `MoleculeProvider auth={client}`)
 *   and uses the bonded forms provider, just like `useForm`. `defaultValues`
 *   and `toValues` must cover every registered control; map nullable text to
 *   `''` there. Add optional write-only controls such as `password: ''` to both,
 *   then omit a blank password in `toPatch`: `({ password, ...changes }) =>
 *   ({ ...changes, ...(password?.trim() ? { password } : {}) })`. `changes`
 *   contains only edited fields, so do not fill omitted fields with null or
 *   copy every property of the auth user into the request. `reset()` discards
 *   edits to the newest baseline. Auth clients with `getSessionRevision()` own
 *   the form by session, so changing a username-derived id does not discard a
 *   successful save. An optional `getIdentity(user)` adds an identity check and
 *   clears edits when it changes; use a stable value. Providers without session
 *   revisions must supply that callback. Field comparisons are shallow, matching form providers.
 *   A submission whose account or auth client changes, or whose form unmounts,
 *   during asynchronous validation is discarded before any mutation or saved
 *   callback. Same-account background hydration does not discard the submit.
 *   The hook captures save failures in `error`; render that error with the
 *   app's normal API-error presentation. Use native `<form>` submit semantics,
 *   and pass the typed `register()` props through custom controls to their
 *   actual input/textarea elements.
 * - **Every hook throws when its provider is not mounted.** `MoleculeProvider` wires ONLY the
 *   services you pass as props — it is a convenience wrapper, not a default registry. The map:
 *   `useAuth`→`auth`, `useTranslation`/`useT`→`i18n`, `useTheme`→`theme`, `useRouter`→`router`,
 *   `useStore`→`state`, `useHttp`→`http`, `useStorage`→`storage`, `useLogger`→`logger`,
 *   `useChat`→`chat`, `useWorkspace`→`workspace`, `useEditor`→`editor`, `usePreview`→`preview`.
 *   "useXProvider must be used within an XProvider" means the matching prop (or individual
 *   provider component) is missing ABOVE the component that calls the hook — fix the wiring,
 *   never wrap the hook in try/catch.
 * - **`useAuth().setSession({ accessToken, user })` adopts a caller-issued session.** For a
 *   custom sign-in exchange (an OAuth redirect, the app's own endpoint that already returned
 *   the token and profile), this stores the token and user and flips the shared client to
 *   `authenticated` in ONE update, so every component reading the hook sees the signed-in
 *   state immediately. `setUser` alone does not sign in, and `setAccessToken` changes storage
 *   only. Type the hook with the app's profile (`useAuth<MyUser>()`) as well as the client
 *   and its config, so the session seed and `user` carry the app's own fields.
 * - **Locale-reactive text requires the hook.** Inside components always read `t` from
 *   `useTranslation()` (or `useT()`); it re-renders on `onLocaleChange` — even when
 *   `addTranslations()` only adds keys for the current locale. Calling the raw `t()` import from
 *   `@molecule/app-i18n` in render works once but leaves stale text after a locale switch.
 * - **Load a page's data with `useQuery` from `@molecule/app-query-react`, never with `fetch` in a
 *   `useEffect`.** A hand-written load effect that cancels on cleanup (a `cancelled` flag or an
 *   `AbortController`) cancels its own request on every re-render when a dependency is rebuilt each
 *   render (`const [.., setError] = useApiErrors()`), and its ref guard then skips the refetch: the
 *   answer is dropped whenever it arrives after a re-render — always on a remote server, never on
 *   localhost. `useQuery` keeps one request per key and aborts it only when the key changes or the
 *   page unmounts (install `@molecule/app-query` + a bond such as `@molecule/app-query-memory`).
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
export * from './hooks/useProfileForm.js'
export * from './providers.js'
export * from './types.js'

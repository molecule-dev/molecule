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
 * For an existing form, `useAuth<MyUser>().updateProfile(changes)` uses that same
 * transport and publishes the saved profile before resolving. If a mutation must
 * use an app-owned API adapter, call `useAuth<MyUser>().setUser(savedUser)` with
 * its canonical response before navigating. A one-time `useState(user?.field)`
 * seed does not follow asynchronous restoration; use `useProfileForm` to hydrate
 * pristine fields while preserving edits.
 *
 * **Local draft state with late data:** `useForm({ defaultValues: { title: '' } }).asState('title')`
 * returns `[title, setTitle, fillTitle]`. Use `setTitle` for user edits and `fillTitle`
 * for request/effect answers; a fill never replaces a dirty value. `asState()` without
 * a field returns the whole object and preserves dirty fields individually. Both edit
 * setters accept functional updates. Pass `resetKey: recordId` to `useForm` when the
 * same component edits different records, so each record starts a fresh draft.
 * External `values` also preserve dirty fields by default; `resetOptions: { keepDirtyValues: false }`
 * explicitly requests replacement. Composite values remain one form field.
 *
 * **Session restore:** `useAuth().status === 'loading'` is undecided: wait for
 * it and redirect only on `status === 'unauthenticated'`. `'unavailable'` keeps
 * the session candidate for retry, but `isAuthenticated` can be false and `user`
 * can be null. A restore failure other than 401/403 never signs out.
 * `MoleculeProvider auth={authClient}` and `AuthProvider client={authClient}`
 * hold public pages until that initial loading status ends by default,
 * so their first render reads the restored user when restoration succeeds.
 * Set `awaitSession={false}` for a deliberately ungated public shell or synchronous SSR.
 * `sessionFallback` remains inside the service providers. Unavailable sessions
 * also render and can still have a null user. Synchronous SSR renders the
 * fallback for a loading client: initialize a request-scoped client first,
 * or leave the opt-in hold disabled for SSR.
 *
 * **Server-backed toggles:** use `useOptimisticValue` for a favorite/follow/like,
 * bookmark or settings switch that changes immediately. Keep its flag and count
 * in one value. Render that value, update it with a functional updater, and return
 * both server fields from `commit`. Do not add a second `useState`, a prop-copy
 * effect, or an `if (pending) return`/disabled-on-pending guard: the hook accepts
 * taps while saving and serializes saves. It coalesces waiting changes to the
 * newest value. Let commit reject on failure so the hook can roll back.
 * Mount a keyed control only after its record loads. Keep it mounted through
 * refetches of that record. The hook protects pending intent from refetches and
 * unchanged old props after a save; it cannot order different server snapshots
 * received after saving finishes, or make a missing record ready for a click.
 *
 * @example
 * ```tsx
 * import { useHttpClient, useOptimisticValue, useTranslation } from '@molecule/app-react'
 *
 * interface FavoriteRecord {
 *   slug: string
 *   favorited: boolean
 *   favoritesCount: number
 * }
 *
 * function FavoriteButton({ article, onChanged }: {
 *   article: FavoriteRecord
 *   onChanged?: (saved: FavoriteRecord) => void
 * }) {
 *   const http = useHttpClient()
 *   const { t } = useTranslation()
 *   const favorite = useOptimisticValue({
 *     value: { favorited: article.favorited, count: article.favoritesCount },
 *     commit: async (next) => {
 *       const path = `/articles/${article.slug}/favorite`
 *       const response = next.favorited
 *         ? await http.post<{ article: FavoriteRecord }>(path)
 *         : await http.delete<{ article: FavoriteRecord }>(path)
 *       const saved = response.data.article
 *       onChanged?.(saved)
 *       return { favorited: saved.favorited, count: saved.favoritesCount }
 *     },
 *   })
 *   return (
 *     <button
 *       aria-pressed={favorite.value.favorited}
 *       aria-label={t('article.favorite', undefined, { defaultValue: 'Favorite article' })}
 *       onClick={() => favorite.update((current) => ({
 *         favorited: !current.favorited,
 *         count: current.count + (current.favorited ? -1 : 1),
 *       }))}
 *     >{favorite.value.count}</button>
 *   )
 * }
 *
 * function FavoriteControl({ article }: { article: FavoriteRecord | null }) {
 *   return article ? <FavoriteButton key={article.slug} article={article} /> : null
 * }
 * ```
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
 *   const { user, status, logout } = useAuth<{ name?: string }>()
 *   const { t } = useTranslation()
 *   const { theme, toggleTheme } = useTheme()
 *
 *   if (status === 'loading') {
 *     return <p>{t('auth.restoring', undefined, { defaultValue: 'Restoring session...' })}</p>
 *   }
 *   if (status === 'unauthenticated') {
 *     return <p>{t('auth.required', undefined, { defaultValue: 'Please log in.' })}</p>
 *   }
 *   return (
 *     <div style={{ background: theme.colors.background }}>
 *       <h1>{t('greeting.welcome', { name: user?.name ?? '' }, { defaultValue: 'Welcome, {{name}}!' })}</h1>
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
 * - Server-backed switches and counters use `useOptimisticValue`. When one commit saves
 *   several records, call its third argument after each accepted request:
 *   `confirm((current) => ({ ...current, [id]: saved }))`, then return nothing. A later
 *   rejection keeps those accepted records while rolling back the unsaved changes.
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
 *   `useT()` returns a function with a STABLE identity (safe as an effect dependency) that also
 *   takes an inline fallback as its second argument: `t('cart.empty', 'Your cart is empty')` is
 *   shorthand for `t('cart.empty', undefined, { defaultValue: 'Your cart is empty' })`.
 *   Prefer it over a hand-written local wrapper (`const t = (key, fallback) => …`), whose new
 *   identity every render re-runs any effect that depends on `t`. The identity also survives a
 *   locale switch, so text memoized on `[t]` alone (`useMemo`, or a `React.memo` child given `t`)
 *   keeps the old language — add `useLocale()` to those dependencies. Register translations at
 *   module scope or in a `useEffect`, never while rendering: the notification would update
 *   other components mid-render.
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
export * from './session-ready.js'
export * from './types.js'

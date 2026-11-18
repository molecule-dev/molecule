/**
 * `@molecule/app-auth-shell-vue` — centered glassmorphic shell for auth pages
 * (Login, Signup, ForgotPassword, ResetPassword), the Vue counterpart of
 * `@molecule/app-auth-shell-react`: the same exports, the same props (React
 * names), and the same DOM for the same input.
 *
 * Apps pass per-app `decoration` (orbs, gradient backdrop) and `brand` (logo +
 * tagline) as node slots or props. The shell handles layout, the glass card,
 * heading/subheading, body slot, footer, and the "Back to home" link.
 *
 * The shell also provides its content through `<AuthFormStateProvider>`, so any
 * form rendered inside inherits cross-view email persistence — the email typed
 * on one auth view (Login/Signup/Forgot/Reset) is carried to the next and
 * cleared on successful auth. Forms read it via `useAuthFormStateContext()`;
 * the underlying `useAuthFormState` composable is also exported for standalone
 * use. Persistence flows through the `@molecule/app-storage` `StorageProvider`
 * abstraction (never raw `sessionStorage`), defaulting to a process-shared
 * in-memory store.
 *
 * Besides the `AuthShell` preset, the package exports the composable primitives
 * it is built from — `AuthShellContainer`, `AuthShellDecoration`,
 * `AuthShellCard`, `AuthShellHeading`, `AuthShellFooter`, `AuthShellBackLink` —
 * plus a two-column family for the "brand panel + form card" split layout:
 * `AuthShellSplit` > `AuthShellSplitRow` > (`AuthShellPanel` +
 * `AuthShellCardColumn`).
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { AuthShell, useAuthFormStateContext } from '@molecule/app-auth-shell-vue'
 * import { createSessionStorageProvider } from '@molecule/app-storage-localstorage'
 *
 * const sessionStore = createSessionStorageProvider({ prefix: 'auth_' })
 *
 * const LoginForm = defineComponent({
 *   setup() {
 *     const { fields, setField, clear } = useAuthFormStateContext()
 *     return () =>
 *       h('form', [
 *         h('input', {
 *           value: fields.value.email ?? '',
 *           onInput: (e: Event) =>
 *             setField('email', (e.target as HTMLInputElement).value),
 *         }),
 *       ])
 *   },
 * })
 *
 * const Login = defineComponent({
 *   setup() {
 *     return () =>
 *       h(
 *         AuthShell,
 *         {
 *           heading: 'Sign in',
 *           subheading: 'Welcome back.',
 *           brand: h('h2', 'Acme'),
 *           formStateStorage: sessionStore,
 *           footer: h('p', 'No account? Sign up'),
 *         },
 *         { default: () => [h(LoginForm)] },
 *       )
 *   },
 * })
 * ```
 *
 * @remarks
 * `AuthShell` renders the binding's router `<Link>` ("Back to home") by
 * default, so it MUST be rendered inside a `moleculePlugin` router; pass
 * `showBackLink={false}` in router-less setups. The back link's arrow uses the
 * Material Symbols icon font — load it, or the glyph renders as text; the glyph
 * span is `aria-hidden="true"`, so the link's accessible name is its `t()` label
 * alone. Form-state persistence defaults to a process-shared in-memory store
 * (survives route
 * swaps, not reloads) — inject `createSessionStorageProvider()` for reload-safe,
 * tab-scoped persistence. Translations come from the companion
 * `@molecule/app-locales-auth-shell` locale bond.
 *
 * @module
 */

export * from './AuthFormStateProvider.js'
export * from './AuthShell.js'
export * from './types.js'
export * from './useAuthFormState.js'

/**
 * `@molecule/app-auth-shell-react` — centered glassmorphic shell for
 * auth pages (Login, Signup, ForgotPassword, ResetPassword).
 *
 * Apps pass per-app `decoration` (orbs, gradient backdrop) and
 * `brand` (logo + tagline) as ReactNode props. The shell handles
 * layout, the glass card, heading/subheading, body slot, footer,
 * and the "Back to home" link.
 *
 * The shell also wraps its content in an `<AuthFormStateProvider>`, so
 * any form rendered inside inherits cross-view email persistence — the
 * email typed on one auth view (Login/Signup/Forgot/Reset) is carried to
 * the next and cleared on successful auth. Forms read it via
 * `useAuthFormStateContext()`; the underlying `useAuthFormState` hook is
 * also exported for standalone use. Persistence flows through the
 * `@molecule/app-storage` `StorageProvider` abstraction (never raw
 * `sessionStorage`), defaulting to a process-shared in-memory store.
 *
 * Besides the `AuthShell` preset, the package exports the composable
 * primitives it is built from — `AuthShellContainer`, `AuthShellDecoration`,
 * `AuthShellCard`, `AuthShellHeading`, `AuthShellFooter`, `AuthShellBackLink` —
 * plus a two-column family for the "brand panel + form card" split layout:
 * `AuthShellSplit` > `AuthShellSplitRow` > (`AuthShellPanel` + `AuthShellCardColumn`).
 *
 * @example
 * ```tsx
 * import { AuthShell, useAuthFormStateContext } from '@molecule/app-auth-shell-react'
 * import { createSessionStorageProvider } from '@molecule/app-storage-localstorage'
 * import { AuthBrandHeader } from './AuthBrandHeader.js'
 * import { Orbs } from './Orbs.js'
 *
 * const sessionStore = createSessionStorageProvider({ prefix: 'auth_' })
 *
 * function LoginForm() {
 *   const { fields, setField, clear } = useAuthFormStateContext()
 *   // bind <input value={fields.email} onChange={(e) => setField('email', e.target.value)} />
 *   // call clear() after a successful sign-in
 * }
 *
 * export function Login() {
 *   return (
 *     <AuthShell
 *       heading="Sign in"
 *       subheading="Welcome back."
 *       brand={<AuthBrandHeader />}
 *       decoration={<Orbs />}
 *       formStateStorage={sessionStore}
 *       footer={<p>No account? <Link to="/signup">Sign up</Link></p>}
 *     >
 *       <LoginForm />
 *     </AuthShell>
 *   )
 * }
 * ```
 *
 * @remarks
 * `AuthShell` renders a react-router `<Link>` ("Back to home") by default,
 * so it MUST be rendered inside a `<Router>`; pass `showBackLink={false}`
 * in router-less setups. The back link's arrow uses the Material Symbols
 * icon font — load it, or the glyph renders as text. The default glass
 * card treatment (`rounded-3xl`, translucent surface, backdrop blur) and
 * the panel's `hidden lg:flex` collapse are Tailwind classes resolved by
 * the wired ClassMap bond's theme tokens — on a non-Tailwind ClassMap,
 * override via `surfaceClassName` / `className`. Form-state persistence
 * defaults to a process-shared in-memory store (survives route swaps, not
 * reloads) — inject `createSessionStorageProvider()` for reload-safe,
 * tab-scoped persistence. Translations come from the companion
 * `@molecule/app-locales-auth-shell` locale bond.
 *
 * @module
 */

export * from './AuthFormStateProvider.js'
export * from './AuthShell.js'
export * from './useAuthFormState.js'

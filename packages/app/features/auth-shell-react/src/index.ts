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
 * @module
 */

export * from './AuthFormStateProvider.js'
export * from './AuthShell.js'
export * from './useAuthFormState.js'

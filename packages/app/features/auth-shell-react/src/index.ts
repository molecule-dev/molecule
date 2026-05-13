/**
 * `@molecule/app-auth-shell-react` — centered glassmorphic shell for
 * auth pages (Login, Signup, ForgotPassword, ResetPassword).
 *
 * Apps pass per-app `decoration` (orbs, gradient backdrop) and
 * `brand` (logo + tagline) as ReactNode props. The shell handles
 * layout, the glass card, heading/subheading, body slot, footer,
 * and the "Back to home" link.
 *
 * @example
 * ```tsx
 * import { AuthShell } from '@molecule/app-auth-shell-react'
 * import { AuthBrandHeader } from './AuthBrandHeader.js'
 * import { Orbs } from './Orbs.js'
 *
 * export function Login() {
 *   return (
 *     <AuthShell
 *       heading="Sign in"
 *       subheading="Welcome back."
 *       brand={<AuthBrandHeader />}
 *       decoration={<Orbs />}
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

export * from './AuthShell.js'

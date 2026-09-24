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
 * import { useState } from 'react'
 * import { BrowserRouter, Link } from 'react-router'
 *
 * import { AuthShell, useAuthFormStateContext } from '@molecule/app-auth-shell-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as authShellLocales from '@molecule/app-locales-auth-shell'
 * import { MoleculeProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(authShellLocales) // "Back to home" in 79 languages
 *
 * function LoginForm() {
 *   // Shared with every other auth view inside an <AuthShell>; clear() after success.
 *   const { fields, setField, clear } = useAuthFormStateContext()
 *   const [password, setPassword] = useState('')
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); clear() }}>
 *       <input type="email" value={fields.email ?? ''} onChange={(e) => setField('email', e.target.value)} />
 *       <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
 *       <button type="submit">Sign in</button>
 *     </form>
 *   )
 * }
 *
 * export function App() {
 *   return (
 *     <MoleculeProvider i18n={getI18nProvider()}>
 *       <BrowserRouter>
 *         <AuthShell
 *           heading="Sign in"
 *           subheading="Welcome back."
 *           brand={<strong>Acme</strong>}
 *           footer={<Link to="/signup">Create an account</Link>}
 *         >
 *           <LoginForm />
 *         </AuthShell>
 *       </BrowserRouter>
 *     </MoleculeProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * `AuthShell` renders a react-router `<Link>` ("Back to home") by default,
 * so it MUST be rendered inside a `<Router>`; pass `showBackLink={false}`
 * in router-less setups. That link reads `useTranslation()` from
 * `@molecule/app-react`, which throws unless an i18n provider is mounted
 * above it (`MoleculeProvider i18n={...}`). `useAuthFormStateContext()`
 * throws outside `<AuthShell>` / `<AuthFormStateProvider>`. `heading`,
 * `subheading` and `children` are required; `heading`/`subheading` are
 * plain strings rendered as-is (translate them before passing). The back link's arrow uses the Material Symbols
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

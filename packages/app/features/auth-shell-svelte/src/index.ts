/**
 * `@molecule/app-auth-shell-svelte` — centered glassmorphic shell for auth
 * pages (Login, Signup, ForgotPassword, ResetPassword), the Svelte counterpart
 * of `@molecule/app-auth-shell-react`: the same exports, the same props (React
 * names), and the same DOM for the same input.
 *
 * Apps pass per-app `decoration` (orbs, gradient backdrop) and `brand` (logo +
 * tagline) as snippets. The shell handles layout, the glass card,
 * heading/subheading, body, footer, and the "Back to home" link.
 *
 * The shell also publishes its content through `AuthFormStateProvider` (via
 * Svelte context), so any form rendered inside inherits cross-view email
 * persistence. Forms read it via `useAuthFormStateContext()`, or use the
 * standalone `useAuthFormState` hook. Persistence flows through the
 * `@molecule/app-storage` `StorageProvider` abstraction (never raw
 * `sessionStorage`), defaulting to a process-shared in-memory store.
 *
 * Besides the `AuthShell` preset, the package exports the composable
 * primitives — `AuthShellContainer`, `AuthShellDecoration`, `AuthShellCard`,
 * `AuthShellHeading`, `AuthShellFooter`, `AuthShellBackLink` — plus a
 * two-column family for the split layout: `AuthShellSplit` >
 * `AuthShellSplitRow` > (`AuthShellPanel` + `AuthShellCardColumn`).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AuthShell, useAuthFormStateContext } from '@molecule/app-auth-shell-svelte'
 *   import { createSessionStorageProvider } from '@molecule/app-storage-localstorage'
 *
 *   const sessionStore = createSessionStorageProvider({ prefix: 'auth_' })
 * </script>
 *
 * <AuthShell
 *   heading="Sign in"
 *   subheading="Welcome back."
 *   formStateStorage={sessionStore}
 * >
 *   {#snippet brand()}<h2>Acme</h2>{/snippet}
 *   {#snippet footer()}<p>No account? Sign up</p>{/snippet}
 *   <LoginForm />
 * </AuthShell>
 * ```
 *
 * @remarks
 * `AuthShell` renders the binding's router `<Link>` ("Back to home") by
 * default, so it MUST be rendered under `setMoleculeContext` with a router;
 * pass `showBackLink={false}` in router-less setups. The back link's arrow
 * uses the Material Symbols icon font; the glyph span is `aria-hidden="true"`,
 * so the link's accessible name is its `t()` label alone. Form-state
 * persistence defaults to a
 * process-shared in-memory store (survives route swaps, not reloads) — inject
 * `createSessionStorageProvider()` for reload-safe, tab-scoped persistence.
 * Translations come from the companion `@molecule/app-locales-auth-shell`
 * locale bond.
 *
 * @module
 */

export * from './components.js'
export * from './context.js'
export * from './types.js'
export * from './useAuthFormState.js'

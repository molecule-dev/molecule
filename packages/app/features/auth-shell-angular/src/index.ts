/**
 * `@molecule/app-auth-shell-angular` — centered glassmorphic shell for auth
 * pages (Login, Signup, ForgotPassword, ResetPassword), the Angular counterpart
 * of `@molecule/app-auth-shell-react`: the same exports, the same props (React
 * names), and the same DOM for the same input.
 *
 * Apps pass per-app `decoration` (orbs, gradient backdrop) and `brand` (logo +
 * tagline) as projected content. The shell handles layout, the glass card,
 * heading/subheading, body, footer, and the "Back to home" link.
 *
 * The shell also publishes its content through a DOM-scoped auth-form context,
 * so any form rendered inside inherits cross-view email persistence. Forms read
 * it via `useAuthFormStateContext()`, or use the standalone `useAuthFormState`
 * hook. Persistence flows through the `@molecule/app-storage` `StorageProvider`
 * abstraction (never raw `sessionStorage`), defaulting to a process-shared
 * in-memory store.
 *
 * Besides the `AuthShell` preset, the package exports the composable
 * primitives — `AuthShellContainer`, `AuthShellDecoration`, `AuthShellCard`,
 * `AuthShellHeading`, `AuthShellFooter`, `AuthShellBackLink` — plus a
 * two-column family for the split layout: `AuthShellSplit` >
 * `AuthShellSplitRow` > (`AuthShellPanel` + `AuthShellCardColumn`).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AuthShell } from '@molecule/app-auth-shell-angular'
 *
 * @Component({
 *   selector: 'app-login',
 *   standalone: true,
 *   imports: [AuthShell],
 *   template: `
 *     <div molAuthShell heading="Sign in" subheading="Welcome back.">
 *       <h2 slot="brand">Acme</h2>
 *       <app-login-form />
 *       <p slot="footer">No account? Sign up</p>
 *     </div>
 *   `,
 * })
 * export class Login {}
 * ```
 *
 * @remarks
 * `AuthShell` renders the binding's `Link` directive (`<a molLink>`) for
 * "Back to home" by default, so render it under `provideMolecule({ router })`;
 * set `[showBackLink]="false"` in router-less setups. The back link's arrow
 * uses the Material Symbols icon font; the glyph span is `aria-hidden="true"`,
 * so the link's accessible name is its `t()` label alone. Form-state
 * persistence defaults to a
 * process-shared in-memory store (survives route swaps, not reloads) — pass a
 * `StorageProvider` for reload-safe, tab-scoped persistence. Translations come
 * from the companion `@molecule/app-locales-auth-shell` locale bond. Node props
 * (`brand`, `decoration`, `footer`) are projected content selected by
 * `[slot=brand]` / `[slot=decoration]` / `[slot=footer]`.
 *
 * @module
 */

export * from './auth-form-state-provider.component.js'
export * from './auth-shell.component.js'
export * from './auth-shell-primitives.component.js'
export * from './auth-shell-split.component.js'
export * from './types.js'
export * from './use-auth-form-state.js'

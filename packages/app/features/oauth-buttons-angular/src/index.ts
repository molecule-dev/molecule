/**
 * Config-driven `OAuthButtons` row — the Angular counterpart of
 * `@molecule/app-oauth-buttons-react` (the same runtime export names, the
 * same props, and the same rendered DOM for the same input).
 *
 * Lifts the bespoke OAuth button row re-implemented by every flagship
 * Login / Signup page into a single composable component, building on
 * `@molecule/app-oauth-logos-angular` for the canonical brand marks.
 *
 * - `providers` accepts the canonical `OAuthProviderId[]` from
 *   `useOAuth(config).providers` (or any other source) — apps no
 *   longer need to map provider strings into bespoke button arrays.
 * - `onSelect(provider)` initiates the OAuth flow. Host apps typically
 *   pass `redirect` from `useOAuth(config)` or `signInWithProvider`
 *   from their auth bond.
 * - `layout` toggles `'horizontal' | 'vertical' | 'grid'` — the grid
 *   variant auto-paginates into a 2-column layout above 4 providers.
 * - `brandButtons` opt-in paints each button with its provider's exact
 *   brand-spec background (`#fff` for Google, `#24292f` for GitHub,
 *   etc.) via inline `style` — those are provider-mandated color tokens
 *   ClassMap intentionally does not encode. It is independent of
 *   `iconMode` (logo color). Layout, padding, radius, and chrome all
 *   come from the wired ClassMap (`cm.oauthButtonGroup`,
 *   `cm.oauthButton`, `cm.oauthButtonIcon`).
 * - `OAuthDivider` is the composable "or continue with" rule — the
 *   config-driven `OAuthButtons` in `@molecule/app-auth-ui-angular`
 *   composes it above this row.
 *
 * Companion locale bond:
 * `@molecule/app-locales-oauth-buttons` (79 languages).
 *
 * @example
 * ```ts
 * import { Component, inject } from '@angular/core'
 * import { useOAuth } from '@molecule/app-angular'
 * import { OAuthButtons } from '@molecule/app-oauth-buttons-angular'
 * import { oauthConfig } from './config'
 *
 * @Component({
 *   selector: 'app-login-page',
 *   standalone: true,
 *   imports: [OAuthButtons],
 *   template: `
 *     <div mol-oauth-buttons
 *       [providers]="oauth().providers"
 *       [onSelect]="oauth().redirect"
 *       layout="grid"
 *       [showLabels]="true"
 *     ></div>
 *   `,
 * })
 * export class LoginPage {
 *   // A hook function runs in an injection context (a field initializer).
 *   readonly oauth = useOAuth(oauthConfig)
 * }
 * ```
 *
 * @remarks
 * Rendering-only: this package draws the buttons; the OAuth handshake
 * itself — authorize redirect, and the callback/code-to-session
 * exchange on return — belongs to `useOAuth(config)` (which needs the
 * `@molecule/app-angular` Auth provider) or your auth bond's
 * `signInWithProvider`. `onSuccess` (the `success` output) fires only
 * for an inline `onSelect` that returns a `Promise` resolving on
 * handshake completion (popup / PKCE); a full-page `redirect` onSelect
 * returns `void`, so `success` does not fire and completion is observed
 * by `useOAuth(config).onSuccess` on the callback page instead.
 * Requires a wired ClassMap bond and a Molecule i18n provider —
 * `getClassMap()` and `useTranslation()` both throw before wiring.
 * React renders `null` when the provider list is empty; this component
 * detaches its host from the DOM in that state, so it contributes no
 * markup at all.
 *
 * @module
 */

export * from './brand-styles.js'
export * from './labels.js'
export * from './layout.js'
export * from './oauth-buttons.component.js'
export * from './oauth-divider.component.js'
export * from './types.js'

/**
 * Config-driven OAuth provider button row — the Svelte counterpart of
 * `@molecule/app-oauth-buttons-react`, with the same components, the same
 * props and the same rendered DOM.
 *
 * Lifts the bespoke OAuth button row re-implemented by every flagship
 * Login / Signup page into a single composable component, building on
 * `@molecule/app-oauth-logos-svelte` for the canonical brand marks.
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
 *   etc.) via the inline `style` attribute — those are provider-mandated
 *   color tokens ClassMap intentionally does not encode. It is
 *   independent of `iconMode` (logo color). Layout, padding, radius, and
 *   chrome all come from the wired ClassMap (`cm.oauthButtonGroup`,
 *   `cm.oauthButton`, `cm.oauthButtonIcon`).
 * - `OAuthDivider` is the composable "or continue with" rule — the
 *   config-driven OAuth row in `@molecule/app-auth-ui-svelte`
 *   composes it above this row.
 *
 * Companion locale bond:
 * `@molecule/app-locales-oauth-buttons` (79 languages).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { OAuthButtons } from '@molecule/app-oauth-buttons-svelte'
 *   import { useOAuth } from '@molecule/app-svelte'
 *   import { oauthConfig } from '../config.js'
 *
 *   const { providers, redirect } = useOAuth(oauthConfig)
 * </script>
 *
 * <OAuthButtons
 *   providers={providers}
 *   onSelect={redirect}
 *   layout="grid"
 *   showLabels
 * />
 * ```
 *
 * @remarks
 * Rendering-only: this package draws the buttons; the OAuth handshake
 * itself — authorize redirect, and the callback/code-to-session
 * exchange on return — belongs to `useOAuth(config)` (which needs the
 * `@molecule/app-svelte` auth context) or your auth bond's
 * `signInWithProvider`. `onSuccess(provider)` fires only for an inline
 * `onSelect` that returns a `Promise` resolving on handshake completion
 * (popup / PKCE); a full-page `redirect` onSelect returns `void`, so
 * `onSuccess` does not fire and completion is observed by
 * `useOAuth(config).onSuccess` on the callback page instead. Requires a
 * wired ClassMap bond and an `I18nProvider` ancestor in
 * `@molecule/app-svelte`'s molecule context — `getClassMap()` and
 * `useTranslation()` both throw before wiring.
 *
 * @module
 */

export * from './brand-styles.js'
export * from './components.js'
export * from './labels.js'
export * from './layout.js'
export * from './types.js'

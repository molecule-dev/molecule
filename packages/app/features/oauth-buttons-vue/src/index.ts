/**
 * Config-driven `<OAuthButtons providers={[...]} />` row, as Vue components.
 *
 * The Vue counterpart of `@molecule/app-oauth-buttons-react`: the same
 * exports, the same props, and the same rendered DOM for the same input.
 * It lifts the bespoke OAuth button row re-implemented by every flagship
 * Login / Signup page into a single composable component, building on
 * `@molecule/app-oauth-logos-vue` for the canonical brand marks.
 *
 * - `providers` accepts the canonical `OAuthProviderId[]` from
 *   `useOAuth(config).providers` (or any other source) — apps no
 *   longer need to map provider strings into bespoke button arrays.
 * - The `select` listener (prop name `onSelect`) initiates the OAuth
 *   flow. Host apps typically pass `redirect` from `useOAuth(config)`
 *   or `signInWithProvider` from their auth bond.
 * - `layout` toggles `'horizontal' | 'vertical' | 'grid'` — the grid
 *   variant auto-paginates into a 2-column layout above 4 providers.
 * - `brandButtons` opt-in paints each button with its provider's exact
 *   brand-spec background (`#fff` for Google, `#24292f` for GitHub,
 *   etc.) via inline `style` — those are provider-mandated color tokens
 *   ClassMap intentionally does not encode. It is independent of
 *   `iconMode` (logo color). Layout, padding, radius, and chrome all
 *   come from the wired ClassMap (`cm.oauthButtonGroup`,
 *   `cm.oauthButton`, `cm.oauthButtonIcon`).
 * - `<OAuthDivider>` is the composable "or continue with" rule — the
 *   config-driven `<OAuthButtons>` in `@molecule/app-auth-ui-vue`
 *   composes it above this row.
 *
 * Companion locale bond:
 * `@molecule/app-locales-oauth-buttons` (79 languages).
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { OAuthButtons } from '@molecule/app-oauth-buttons-vue'
 * import { useOAuth } from '@molecule/app-vue'
 * import { oauthConfig } from '../config'
 *
 * export const LoginPage = defineComponent({
 *   setup() {
 *     const { providers, redirect } = useOAuth(oauthConfig)
 *     return () =>
 *       h(OAuthButtons, { providers: providers.value, onSelect: redirect })
 *   },
 * })
 * ```
 *
 * @remarks
 * Rendering-only: this package draws the buttons; the OAuth handshake
 * itself — authorize redirect, and the callback/code-to-session
 * exchange on return — belongs to `useOAuth(config)` (which needs the
 * `@molecule/app-vue` Auth provider context) or your auth bond's
 * `signInWithProvider`. The `success` listener fires only for an
 * inline `select` handler that returns a `Promise` resolving on
 * handshake completion (popup / PKCE); a full-page `redirect` handler
 * returns `void`, so `success` does not fire and completion is
 * observed by `useOAuth(config).onSuccess` on the callback page
 * instead. Requires a wired ClassMap bond and a Vue `I18nProvider`
 * ancestor — `getClassMap()` and `useTranslation()` both throw before
 * wiring.
 *
 * @module
 */

export * from './brand-styles.js'
export * from './labels.js'
export * from './layout.js'
export * from './OAuthButtons.js'
export * from './OAuthDivider.js'
export * from './types.js'

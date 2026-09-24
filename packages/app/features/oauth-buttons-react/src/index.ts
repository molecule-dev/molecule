/**
 * Config-driven `<OAuthButtons providers={[...]} />` row.
 *
 * Lifts the bespoke `OAuthButtons.tsx` re-implemented by every flagship
 * Login / Signup page today into a single composable component, building
 * on `@molecule/app-oauth-logos-react` for the canonical brand marks.
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
 * - `<OAuthDivider>` is the composable "or continue with" rule — the
 *   config-driven `<OAuthButtons>` in `@molecule/app-auth-ui-react`
 *   composes it above this row.
 *
 * Companion locale bond:
 * `@molecule/app-locales-oauth-buttons` (79 languages).
 *
 * @example
 * ```tsx
 * import { OAuthButtons, OAuthDivider } from '@molecule/app-oauth-buttons-react'
 * import { useOAuth } from '@molecule/app-react'
 *
 * // Module scope, so useOAuth's memoised callbacks stay stable across renders.
 * const oauthConfig = {
 *   baseURL: import.meta.env.VITE_API_URL,
 *   oauthEndpoint: '/users/oauth', // GET /users/oauth/:provider (`@molecule/api-resource-user`)
 *   oauthProviders: ['google', 'github', 'apple'],
 *   onSuccess: () => window.location.assign('/dashboard'),
 * }
 *
 * export function LoginPage() {
 *   // Also mount this on the page the provider returns to — useOAuth finishes the ?code exchange there.
 *   const { providers, loginViaPopup } = useOAuth(oauthConfig)
 *   return (
 *     <section>
 *       <OAuthDivider />
 *       <OAuthButtons
 *         providers={providers}
 *         onSelect={loginViaPopup} // or `redirect` for a full-page flow
 *         layout="vertical"
 *         showLabels
 *         brandButtons
 *       />
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * `useOAuth()` calls `useAuthClient()`, so the tree needs a `MoleculeProvider` with BOTH `auth`
 * (e.g. `createJWTAuthClient({ baseURL })` from `@molecule/app-auth`) and `i18n` — either missing
 * throws. `useOAuth` defaults `oauthEndpoint` to `/oauth`; the molecule user resource serves
 * `/users/oauth/:provider`, so set it explicitly as above. `providers` comes ONLY from
 * `oauthProviders` — nothing asks the API which providers are enabled; an empty list renders
 * `null`. Labels are hidden unless `showLabels` is set (each button still has a
 * "Continue with <Provider>" aria-label). The divider's `oauth.orContinueWith` key lives in
 * `@molecule/app-locales-common`, the provider names in `@molecule/app-locales-oauth-buttons`.
 *
 * Rendering-only: this package draws the buttons; the OAuth handshake
 * itself — authorize redirect, and the callback/code-to-session
 * exchange on return — belongs to `useOAuth(config)` (which needs the
 * `@molecule/app-react` Auth provider context) or your auth bond's
 * `signInWithProvider`. `onSuccess(provider)` fires only for an inline
 * `onSelect` that returns a `Promise` resolving on handshake completion
 * (popup / PKCE); a full-page `redirect` onSelect returns `void`, so
 * `onSuccess` does not fire and completion is observed by
 * `useOAuth(config).onSuccess` on the callback page instead. Requires a
 * wired ClassMap bond and a React `I18nProvider` ancestor —
 * `getClassMap()` and `useTranslation()` both throw before wiring.
 *
 * @module
 */

export * from './brand-styles.js'
export * from './labels.js'
export * from './layout.js'
export * from './OAuthButtons.js'
export * from './OAuthDivider.js'
export * from './types.js'

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
 * import { OAuthButtons } from '@molecule/app-oauth-buttons-react'
 * import { useOAuth } from '@molecule/app-react'
 * import { oauthConfig } from '../config'
 *
 * function LoginPage() {
 *   const { providers, redirect } = useOAuth(oauthConfig)
 *   return (
 *     <OAuthButtons
 *       providers={providers}
 *       onSelect={redirect}
 *       layout="grid"
 *       showLabels
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './brand-styles.js'
export * from './labels.js'
export * from './layout.js'
export * from './OAuthButtons.js'
export * from './OAuthDivider.js'
export * from './types.js'

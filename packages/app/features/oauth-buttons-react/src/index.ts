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
 * - Brand-spec backgrounds (`#fff` for Google, `#24292f` for GitHub,
 *   etc.) are applied inline because they are exact provider-mandated
 *   color tokens that ClassMap intentionally does not encode. Layout,
 *   padding, radius, and chrome all come from the wired ClassMap
 *   (`cm.oauthButtonGroup`, `cm.oauthButton`, `cm.oauthButtonIcon`).
 *
 * Companion locale bond:
 * `@molecule/app-locales-oauth-buttons-react` (79 languages).
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
export * from './types.js'

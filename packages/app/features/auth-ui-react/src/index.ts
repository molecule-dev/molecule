/**
 * React auth-kit components for molecule.dev.
 *
 * Exports `<OAuthButtons>` — the config-driven OAuth row for branded
 * Login/Signup pages: reads `providers` from `useOAuth(oauthConfig)`,
 * renders the "or continue with" divider + provider buttons, and owns
 * the CALLBACK half of the page-based flow (`?code&state` exchange on
 * the page it is mounted on, with a visible inline error on failure).
 *
 * NOT the same component as `OAuthButtons` from
 * `@molecule/app-oauth-buttons-react` — that lower-level primitive takes
 * an explicit `providers` list and renders only the row; this one wraps
 * it and takes the app's `oauthConfig` from `config.ts`. Structural
 * pieces only — branded layout, copy, and chrome stay at the app level.
 *
 * @example
 * ```tsx
 * import { OAuthButtons } from '@molecule/app-auth-ui-react'
 * import { oauthConfig } from './config.js'
 *
 * // On the Login/Signup page (the OAuth redirect must land back here):
 * <OAuthButtons
 *   oauthConfig={oauthConfig}
 *   showLabels
 *   onSuccess={() => navigate('/dashboard')}
 * />
 * ```
 *
 * @remarks
 * Renders `null` when `oauthConfig` yields no providers — safe to include
 * unconditionally. Mount it on the page the OAuth provider redirects back
 * to, or the code exchange never runs. A failed exchange renders an
 * inline `role="alert"` error (`data-mol-id="oauth-error"`) and also
 * calls `onError`. Divider copy defaults to "or continue with"
 * (override via `dividerKey` / `dividerDefault`); translations come from
 * the companion `@molecule/app-locales-oauth-buttons` locale bond.
 *
 * @module
 */

export * from './OAuthButtons.js'

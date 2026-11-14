/**
 * Angular auth-kit components — the counterpart of
 * `@molecule/app-auth-ui-react` (the same runtime export names, the same
 * props, and the same rendered DOM for the same input).
 *
 * Exports the `OAuthButtons` component — the config-driven OAuth row for
 * branded Login/Signup pages: reads `providers` from `useOAuth(oauthConfig)`,
 * renders the "or continue with" divider + provider buttons, and owns
 * the CALLBACK half of the page-based flow (`?code&state` exchange on
 * the page it is mounted on, with a visible inline error on failure).
 *
 * NOT the same component as `OAuthButtons` from
 * `@molecule/app-oauth-buttons-angular` — that lower-level primitive takes
 * an explicit `providers` list and renders only the row; this one wraps
 * it and takes the app's `oauthConfig` from `config.ts`. Structural
 * pieces only — branded layout, copy, and chrome stay at the app level.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { OAuthButtons } from '@molecule/app-auth-ui-angular'
 * import { oauthConfig } from './config'
 *
 * // On the Login/Signup page (the OAuth redirect must land back here):
 * @Component({
 *   selector: 'app-login-page',
 *   standalone: true,
 *   imports: [OAuthButtons],
 *   template: `
 *     <div mol-auth-oauth-buttons
 *       [oauthConfig]="config"
 *       [showLabels]="true"
 *       (success)="navigate('/dashboard')"
 *     ></div>
 *   `,
 * })
 * export class LoginPage {
 *   config = oauthConfig
 *   navigate(to: string): void {}
 * }
 * ```
 *
 * @remarks
 * Renders nothing when `oauthConfig` yields no providers (the host is
 * detached from the DOM) — safe to include unconditionally. Mount it on
 * the page the OAuth provider redirects back to, or the code exchange
 * never runs. A failed exchange renders an inline `role="alert"` error
 * (`data-mol-id="oauth-error"`) and also fires the `error` output.
 * Divider copy defaults to "or continue with" (override via
 * `dividerKey` / `dividerDefault`); translations come from the
 * companion `@molecule/app-locales-oauth-buttons` locale bond.
 *
 * @module
 */

export * from './oauth-buttons.component.js'

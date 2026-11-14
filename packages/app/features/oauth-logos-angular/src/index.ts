/**
 * Canonical OAuth provider brand logos — the Angular counterpart of
 * `@molecule/app-oauth-logos-react` (the same runtime export names, the same
 * props, and the same rendered DOM for the same input).
 *
 * Ships every logo as a self-contained standalone Angular SVG component with
 * a normalized 24×24 viewBox and a `mode` input (`'brand'` default — the
 * official multi-color mark — or `'mono'` — `currentColor` for
 * uniform-theme button rows).
 *
 * Unlike resolving icons through `@molecule/app-icons`, these logos
 * are bundled inline so every app renders pixel-identical marks
 * regardless of which icon-set bond is wired.
 *
 * Exports:
 * - `OAuthProviderLogo` (`provider="github"|"google"|...`) — dispatcher.
 * - Individual logos: `GitHubLogo`, `GoogleLogo`, `GitLabLogo`,
 *   `TwitterLogo` / `XLogo`, `AppleLogo`, `FacebookLogo`,
 *   `MicrosoftLogo`, `LinkedInLogo`, `DiscordLogo`.
 * - `OAuthProviderId`, `OAuthLogoProps` types.
 *
 * Every component's host names the native element React renders at its
 * root: an attribute selector on the `<svg>` (`svg[mol-github-logo]`) for
 * the logos, and an unwrapped element host (`mol-oauth-provider-logo`,
 * `display: contents`) for the dispatcher, whose React root is a fragment.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { getClassMap, type UIClassMap } from '@molecule/app-ui'
 * import { OAuthProviderLogo } from '@molecule/app-oauth-logos-angular'
 *
 * @Component({
 *   selector: 'app-oauth-button',
 *   standalone: true,
 *   imports: [OAuthProviderLogo],
 *   template: `
 *     <button type="button" [class]="cm().myButtonChrome">
 *       <svg mol-oauth-provider-logo [provider]="'github'" [size]="20" />
 *       <span>Continue with GitHub</span>
 *     </button>
 *   `,
 * })
 * export class OauthButton {
 *   cm(): UIClassMap {
 *     return getClassMap()
 *   }
 * }
 * ```
 *
 * @module
 */

export * from './apple-logo.component.js'
export * from './discord-logo.component.js'
export * from './facebook-logo.component.js'
export * from './github-logo.component.js'
export * from './gitlab-logo.component.js'
export * from './google-logo.component.js'
export * from './linkedin-logo.component.js'
export * from './microsoft-logo.component.js'
export * from './oauth-provider-logo.component.js'
export * from './twitter-logo.component.js'
export * from './types.js'

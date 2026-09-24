/**
 * Canonical OAuth provider brand logos.
 *
 * Ships every logo as a self-contained React SVG component with a
 * normalized 24×24 viewBox and a `mode` prop (`'brand'` default — the
 * official multi-color mark — or `'mono'` — `currentColor` for
 * uniform-theme button rows).
 *
 * Unlike resolving icons through `@molecule/app-icons`, these logos
 * are bundled inline so every app renders pixel-identical marks
 * regardless of which icon-set bond is wired.
 *
 * Exports:
 * - `<OAuthProviderLogo provider="github"|"google"|... />` — dispatcher.
 * - Individual logos: `<GitHubLogo/>`, `<GoogleLogo/>`, `<GitLabLogo/>`,
 *   `<TwitterLogo/>` / `<XLogo/>`, `<AppleLogo/>`, `<FacebookLogo/>`,
 *   `<MicrosoftLogo/>`, `<LinkedInLogo/>`, `<DiscordLogo/>`.
 * - `OAuthProviderId`, `OAuthLogoProps` types.
 *
 * @example
 * ```tsx
 * import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
 *
 * const providers = [
 *   { id: 'google', name: 'Google' },
 *   { id: 'github', name: 'GitHub' },
 *   { id: 'okta', name: 'Okta' }, // no bundled logo → fallback renders
 * ]
 *
 * export function SignInLinks() {
 *   return (
 *     <nav>
 *       {providers.map((p) => (
 *         <a key={p.id} href={`/api/users/oauth/${p.id}`}>
 *           <OAuthProviderLogo provider={p.id} size={20} mode="brand" ariaLabel="" fallback={<span aria-hidden="true">🔑</span>} />
 *           <span>Continue with {p.name}</span>
 *         </a>
 *       ))}
 *     </nav>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Logos only — no buttons, labels, click handling or OAuth flow. For a ready-made button row
 *   use `@molecule/app-oauth-buttons-react`.
 * - Pass `ariaLabel=""` when the surrounding control already names the provider — the SVG then
 *   becomes `aria-hidden`; otherwise it announces the brand name (`"GitHub"`).
 * - Unknown provider ids render `fallback` (default `null` — nothing), they do NOT throw.
 *   `'twitter'` and `'x'` both render the X mark (`XLogo` is an alias of `TwitterLogo`).
 * - `mode="mono"` switches to `currentColor`; the GitHub, Apple and X marks are always
 *   `currentColor` (their brand guidelines are monochrome), so give them readable text color.
 * - No ClassMap, i18n or icon-set bond needed; `size` is pixels (default 20).
 *
 * @module
 */

export * from './AppleLogo.js'
export * from './DiscordLogo.js'
export * from './FacebookLogo.js'
export * from './GitHubLogo.js'
export * from './GitLabLogo.js'
export * from './GoogleLogo.js'
export * from './LinkedInLogo.js'
export * from './MicrosoftLogo.js'
export * from './OAuthProviderLogo.js'
export * from './TwitterLogo.js'
export * from './types.js'

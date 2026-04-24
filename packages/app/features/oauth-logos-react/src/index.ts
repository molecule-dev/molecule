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
 * <button className={app.myButtonChrome}>
 *   <OAuthProviderLogo provider="github" size={20} />
 *   <span>Continue with GitHub</span>
 * </button>
 * ```
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

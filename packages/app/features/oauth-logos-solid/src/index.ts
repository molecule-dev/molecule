/**
 * Canonical OAuth provider brand logos for SolidJS — the Solid counterpart
 * of `@molecule/app-oauth-logos-react`, with the same export names, the same
 * props (React names), and the same DOM for the same input.
 *
 * Ships every logo as a self-contained Solid SVG component with a
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
 * import { OAuthProviderLogo } from '@molecule/app-oauth-logos-solid'
 *
 * <button class={app.myButtonChrome}>
 *   <OAuthProviderLogo provider="github" size={20} />
 *   <span>Continue with GitHub</span>
 * </button>
 * ```
 *
 * @module
 */

export * from './AppleLogo.jsx'
export * from './DiscordLogo.jsx'
export * from './FacebookLogo.jsx'
export * from './GitHubLogo.jsx'
export * from './GitLabLogo.jsx'
export * from './GoogleLogo.jsx'
export * from './LinkedInLogo.jsx'
export * from './MicrosoftLogo.jsx'
export * from './OAuthProviderLogo.jsx'
export * from './TwitterLogo.jsx'
export * from './types.js'

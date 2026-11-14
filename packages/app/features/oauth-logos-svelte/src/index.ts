/**
 * Canonical OAuth provider brand logos — the Svelte counterpart of
 * `@molecule/app-oauth-logos-react`, with the same components, the same props
 * and the same rendered DOM.
 *
 * Ships every logo as a self-contained Svelte 5 SVG component with a
 * normalized 24×24 viewBox and a `mode` prop (`'brand'` default — the
 * official multi-color mark — or `'mono'` — `currentColor` for
 * uniform-theme button rows).
 *
 * Unlike resolving icons through `@molecule/app-icons`, these logos
 * are bundled inline so every app renders pixel-identical marks
 * regardless of which icon-set bond is wired.
 *
 * Exports:
 * - `OAuthProviderLogo` — dispatcher (with a `fallback` snippet).
 * - Individual logos: `GitHubLogo`, `GoogleLogo`, `GitLabLogo`,
 *   `TwitterLogo` / `XLogo`, `AppleLogo`, `FacebookLogo`,
 *   `MicrosoftLogo`, `LinkedInLogo`, `DiscordLogo`.
 * - `OAuthProviderId`, `OAuthLogoProps`, `OAuthProviderLogoProps` types.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { getClassMap } from '@molecule/app-ui'
 *   import { OAuthProviderLogo } from '@molecule/app-oauth-logos-svelte'
 *
 *   const cm = getClassMap()
 * </script>
 *
 * <button class={cm.myButtonChrome}>
 *   <OAuthProviderLogo provider="github" size={20} />
 *   <span>Continue with GitHub</span>
 * </button>
 * ```
 *
 * @module
 */

export { default as AppleLogo } from './AppleLogo.svelte'
export { default as DiscordLogo } from './DiscordLogo.svelte'
export { default as FacebookLogo } from './FacebookLogo.svelte'
export { default as GitHubLogo } from './GitHubLogo.svelte'
export { default as GitLabLogo } from './GitLabLogo.svelte'
export { default as GoogleLogo } from './GoogleLogo.svelte'
export { default as LinkedInLogo } from './LinkedInLogo.svelte'
export { default as MicrosoftLogo } from './MicrosoftLogo.svelte'
export { default as OAuthProviderLogo } from './OAuthProviderLogo.svelte'
export { default as TwitterLogo } from './TwitterLogo.svelte'
export { default as XLogo } from './TwitterLogo.svelte'
export * from './types.js'

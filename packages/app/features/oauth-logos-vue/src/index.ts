/**
 * Canonical OAuth provider brand logos, as Vue SVG components.
 *
 * The Vue counterpart of `@molecule/app-oauth-logos-react`: the same
 * exports, the same props, and the same rendered DOM for the same input.
 * Every logo ships as a self-contained Vue component with a normalized
 * 24×24 viewBox and a `mode` prop (`'brand'` default — the official
 * multi-color mark — or `'mono'` — `currentColor` for uniform-theme
 * button rows).
 *
 * Unlike resolving icons through `@molecule/app-icons`, these logos
 * are bundled inline so every app renders pixel-identical marks
 * regardless of which icon-set bond is wired.
 *
 * Exports:
 * - `OAuthProviderLogo` — dispatcher for a provider id.
 * - Individual logos: `GitHubLogo`, `GoogleLogo`, `GitLabLogo`,
 *   `TwitterLogo` / `XLogo`, `AppleLogo`, `FacebookLogo`,
 *   `MicrosoftLogo`, `LinkedInLogo`, `DiscordLogo`.
 * - `OAuthProviderId`, `OAuthLogoProps`, `OAuthProviderLogoProps` types.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { OAuthProviderLogo } from '@molecule/app-oauth-logos-vue'
 * import { getClassMap } from '@molecule/app-ui'
 *
 * export const LoginButton = defineComponent({
 *   setup() {
 *     const cm = getClassMap()
 *     return () =>
 *       h('button', { class: cm.cn(cm.myButtonChrome) }, [
 *         h(OAuthProviderLogo, { provider: 'github', size: 20 }),
 *         h('span', 'Continue with GitHub'),
 *       ])
 *   },
 * })
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

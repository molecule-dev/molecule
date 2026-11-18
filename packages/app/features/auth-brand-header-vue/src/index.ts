/**
 * Vue auth-page brand header.
 *
 * Exports `AuthBrandHeader` — a centered wrapper holding a gradient
 * material-symbol chip + wordmark + tagline. Two modes: preset (pass
 * `appName` / `tagline` / `icon` and the default chip + wordmark + tagline
 * render) or composed (pass content in the default slot built from the
 * exported `AuthBrandHeaderChip`, `AuthBrandHeaderWordmark`, and
 * `AuthBrandHeaderTagline` sub-components — preset props are then ignored).
 *
 * It is the Vue counterpart of `@molecule/app-auth-brand-header-react`: same
 * props and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { AuthBrandHeader } from '@molecule/app-auth-brand-header-vue'
 * import { APP_NAME, APP_TAGLINE } from './branding'
 *
 * const MyAuthHeader = defineComponent({
 *   setup() {
 *     return () =>
 *       h(AuthBrandHeader, {
 *         appName: APP_NAME,
 *         tagline: APP_TAGLINE,
 *         icon: 'gavel',
 *         chipGradient: 'linear-gradient(135deg, #e05a2b, #f06a3b)',
 *         wordmarkColor: '#e05a2b',
 *       })
 *   },
 * })
 *
 * createApp(MyAuthHeader).mount('#app')
 * ```
 *
 * @remarks
 * `icon` is a Material Symbols name rendered with the
 * `material-symbols-outlined` icon font — the app must load that font
 * (molecule scaffolds do; a custom stack must add it) or the icon name
 * renders as literal text. Omit `icon` to skip the chip entirely. The
 * default chip/wordmark treatment uses Tailwind theme tokens
 * (`bg-primary`, `text-on-surface`) from the wired ClassMap bond — with a
 * non-Tailwind ClassMap, pass `chipGradient` / `wordmarkColor` / `className`
 * explicitly.
 *
 * @module
 */

export * from './AuthBrandHeader.js'
export * from './types.js'

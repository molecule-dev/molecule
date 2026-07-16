/**
 * `@molecule/app-auth-brand-header-react` — auth-page brand header:
 * gradient icon chip + wordmark + tagline, centered.
 *
 * Two modes: preset (pass `appName` / `tagline` / `icon` and the default
 * chip + wordmark + tagline render) or composed (pass `children` built
 * from the exported `<AuthBrandHeaderChip>`, `<AuthBrandHeaderWordmark>`,
 * and `<AuthBrandHeaderTagline>` sub-components — preset props are then
 * ignored).
 *
 * @example
 * ```tsx
 * import { AuthBrandHeader } from '@molecule/app-auth-brand-header-react'
 * import { APP_NAME, APP_TAGLINE } from '../branding.js'
 *
 * export function MyAuthHeader() {
 *   return (
 *     <AuthBrandHeader
 *       appName={APP_NAME}
 *       tagline={APP_TAGLINE}
 *       icon="gavel"
 *       chipGradient="linear-gradient(135deg, #e05a2b, #f06a3b)"
 *       wordmarkColor="#e05a2b"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * `icon` is a Material Symbols name rendered with the
 * `material-symbols-outlined` icon font — the app must load that font
 * (molecule scaffolds do; a custom stack must add it) or the icon name
 * renders as literal text. Omit `icon` to skip the chip entirely. The
 * default chip/wordmark treatment uses Tailwind theme tokens
 * (`bg-primary`, `text-on-surface`) from the wired ClassMap bond — with
 * a non-Tailwind ClassMap, pass `chipGradient` / `wordmarkColor` /
 * `className` explicitly.
 *
 * @module
 */

export * from './AuthBrandHeader.js'

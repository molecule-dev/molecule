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
 *
 * const APP_NAME = 'Casebook'
 * const APP_TAGLINE = 'Case management for small law firms'
 *
 * export function LoginHeader() {
 *   return <AuthBrandHeader appName={APP_NAME} tagline={APP_TAGLINE} icon="gavel" chipShape="square" />
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
 * It calls `useTranslation()` from `@molecule/app-react`, so it MUST render
 * inside `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise);
 * `getClassMap()` throws unless `setClassMap(classMap)` ran at startup. In
 * preset mode `appName` and `tagline` are rendered through `t()` keys
 * `authBrandHeader.appName` / `authBrandHeader.tagline` with the prop
 * interpolated, so the text you pass shows unless a locale bond overrides
 * those keys. Passing `children` switches to composed mode and silently
 * ignores every preset prop (`appName`, `tagline`, `icon`, `chipGradient`,
 * `chipShape`, `wordmarkColor`). It is only the header — no form, no auth
 * calls.
 *
 * @module
 */

export * from './AuthBrandHeader.js'

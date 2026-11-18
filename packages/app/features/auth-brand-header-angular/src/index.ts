/**
 * Angular auth-page brand header.
 *
 * Exports `<AuthBrandHeader>` — a centered wrapper holding a gradient
 * material-symbol chip + wordmark + tagline, with the sub-components
 * `<AuthBrandHeaderChip>`, `<AuthBrandHeaderWordmark>` and
 * `<AuthBrandHeaderTagline>` exported alongside it. It is the Angular
 * counterpart of `@molecule/app-auth-brand-header-react`: same props and the
 * same DOM for the same input.
 *
 * Two modes: preset (pass `appName` / `tagline` / `icon` and the default chip +
 * wordmark + tagline render) or composed (project content built from the
 * exported sub-components — the preset props are then ignored).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AuthBrandHeader } from '@molecule/app-auth-brand-header-angular'
 * import { APP_NAME, APP_TAGLINE } from './branding'
 *
 * @Component({
 *   selector: 'app-auth-header',
 *   standalone: true,
 *   imports: [AuthBrandHeader],
 *   template: `
 *     <div
 *       mol-auth-brand-header
 *       [appName]="appName"
 *       [tagline]="tagline"
 *       icon="gavel"
 *       chipGradient="linear-gradient(135deg, #e05a2b, #f06a3b)"
 *       wordmarkColor="#e05a2b"
 *     ></div>
 *   `,
 * })
 * export class MyAuthHeader {
 *   readonly appName = APP_NAME
 *   readonly tagline = APP_TAGLINE
 * }
 * ```
 *
 * @remarks
 * `icon` is a Material Symbols name rendered with the
 * `material-symbols-outlined` icon font — the app must load that font
 * (molecule scaffolds do; a custom stack must add it) or the icon name
 * renders as literal text. Omit `icon` to skip the chip entirely. The default
 * chip/wordmark treatment uses Tailwind theme tokens (`bg-primary`,
 * `text-on-surface`) from the wired ClassMap bond — with a non-Tailwind
 * ClassMap, pass `chipGradient` / `wordmarkColor` / `className` explicitly.
 * Requires the binding's i18n (`provideI18n` or `provideMolecule`) for
 * `useTranslation()`.
 *
 * @module
 */

export * from './app-auth-brand-header.component.js'
export * from './app-auth-brand-header-chip.component.js'
export * from './app-auth-brand-header-tagline.component.js'
export * from './app-auth-brand-header-wordmark.component.js'
export * from './types.js'

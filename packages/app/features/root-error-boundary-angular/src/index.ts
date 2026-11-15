/**
 * Angular top-level error boundary — the counterpart of
 * `@molecule/app-root-error-boundary-react`: the same props and the same DOM
 * for the same input.
 *
 * Exports `<RootErrorBoundary>` (projected `children`, or a `content`
 * `TemplateRef` input for a tree the boundary instantiates inside its own
 * view). Mount it directly under your routing root so it covers the whole
 * route tree.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { RootErrorBoundary } from '@molecule/app-root-error-boundary-angular'
 *
 * @Component({
 *   selector: 'app-root',
 *   standalone: true,
 *   imports: [RootErrorBoundary],
 *   template: `
 *     <mol-root-error-boundary>
 *       <router-outlet />
 *     </mol-root-error-boundary>
 *   `,
 * })
 * export class AppRoot {}
 * ```
 *
 * @remarks
 * - The fallback UI styles itself via `getClassMap()` — if no ClassMap is
 *   bonded the boundary itself throws while rendering the fallback. Ensure
 *   `setClassMap()` runs during bootstrap, before anything can error.
 * - There is no retry/reload action — the fallback is a static message
 *   (key `error.unknown`). Wrap or fork when you need a recovery button.
 * - The boundary catches RENDER errors only — not event handlers, async code,
 *   or server-side rendering errors.
 * - Projected content is created by the parent's view, outside the boundary's
 *   catch: guard a route component by passing it as the `content`
 *   `TemplateRef` input instead.
 * - The fallback translates through `useTranslation()`, so it re-renders in
 *   the new language after a locale switch. No providers are required:
 *   outside them it reads the bonded `@molecule/app-i18n` provider, and
 *   without locale registration it falls back to English. Translations:
 *   `@molecule/app-locales-root-error-boundary`.
 *
 * @module
 */

export * from './root-error-boundary.component.js'

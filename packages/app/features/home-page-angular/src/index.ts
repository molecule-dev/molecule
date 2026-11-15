/**
 * `<Home />` (Angular) — authenticated home page with personalized greeting.
 *
 * The Angular counterpart of `@molecule/app-home-page-react`: same export,
 * same DOM for the same input. Renders a single H2 of the form
 * `{home.greeting}{name|email|home.world}!` using the universal
 * common-locale bond. Used as the default post-login landing page when the
 * app has no app-specific dashboard.
 *
 * Replaces the byte-identical `pages/Home.tsx` shipped by 19 of the 38
 * flagship apps that have an authenticated Home route. Apps that
 * override `home.greeting` per-app (e.g. note-taking's
 * "Hello, {{name}}.") get the override automatically — the page reads
 * the resolved translation, which spreads the bond default beneath
 * any per-app override.
 *
 * @example
 * ```html
 * <!-- The host element IS React's root: a div, not a custom tag. -->
 * <div mol-home-page></div>
 * ```
 *
 * ```ts
 * import { Component } from '@angular/core'
 * import { Home } from '@molecule/app-home-page-angular'
 *
 * @Component({
 *   selector: 'app-root',
 *   standalone: true,
 *   imports: [Home],
 *   template: `<main><div mol-home-page></div></main>`,
 * })
 * export class AppComponent {}
 * ```
 *
 * @remarks
 * - Calls `useAuth()` and `useTranslation()` — both THROW unless the app's
 *   providers include `provideMolecule({ auth, i18n })` (from
 *   `@molecule/app-angular`; scaffolded apps do this in `app.config.ts`).
 * - `home.greeting` / `home.world` have NO inline English fallback: they
 *   resolve from `@molecule/app-locales-common`, which the app's i18n setup
 *   merges automatically. A custom i18n setup must register the common bond
 *   or the raw keys render on screen.
 *
 * @module
 */

export * from './home-page.component.js'

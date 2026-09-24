/**
 * Angular framework bindings for molecule.dev.
 *
 * Provides Angular-specific services and providers for all molecule
 * core interfaces. This package enables the use of molecule's framework-agnostic
 * interfaces with Angular's idioms (services, DI, RxJS observables, etc.).
 *
 * @example
 * ```typescript
 * // main.ts
 * import { AsyncPipe } from '@angular/common'
 * import { Component, inject } from '@angular/core'
 * import { bootstrapApplication } from '@angular/platform-browser'
 *
 * import { MoleculeAuthService, MoleculeThemeService, provideMolecule, t } from '@molecule/app-angular'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import {
 *   registerLocaleModule,
 *   setProvider as setI18nProvider,
 *   simpleProvider as i18nProvider,
 * } from '@molecule/app-i18n'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * // `t()` translates through the BONDED i18n provider — bond it AND pass it to provideMolecule.
 * setI18nProvider(i18nProvider)
 * registerLocaleModule(commonLocales) // translations for the `auth.*` / `theme.*` keys below
 * const authClient = createJWTAuthClient<User>({ baseURL: '/api' })
 *
 * @Component({
 *   selector: 'app-root',
 *   imports: [AsyncPipe],
 *   template: `
 *     <main [attr.data-theme]="mode$ | async">
 *       <h1>
 *         @if (isAuthenticated$ | async) {
 *           {{ t('auth.login.signInTitle', undefined, { defaultValue: 'Welcome back' }) }}
 *         } @else {
 *           {{ t('auth.login.logIn', undefined, { defaultValue: 'Log in' }) }}
 *         }
 *       </h1>
 *       <button type="button" data-mol-id="toggle-theme" (click)="toggleTheme()">
 *         {{ t('theme.toggle', undefined, { defaultValue: 'Toggle theme' }) }}
 *       </button>
 *     </main>
 *   `,
 * })
 * class AppComponent {
 *   // Expose the reactive t() so template bindings re-evaluate on locale change.
 *   protected readonly t = t
 *   private readonly auth: MoleculeAuthService<User> = inject(MoleculeAuthService)
 *   private readonly theme = inject(MoleculeThemeService)
 *   protected readonly isAuthenticated$ = this.auth.isAuthenticated$
 *   protected readonly mode$ = this.theme.mode$ // Observable<'light' | 'dark'>
 *
 *   toggleTheme(): void {
 *     this.theme.toggleTheme()
 *   }
 * }
 *
 * // index.html contains <app-root></app-root>.
 * await bootstrapApplication(AppComponent, {
 *   providers: [provideMolecule({ auth: authClient, theme: themeProvider, i18n: i18nProvider })],
 * })
 * ```
 *
 * @remarks
 * - Peer requirements: Angular 22 (`@angular/core` is pinned to 22.0.0) and
 *   rxjs 7.8+.
 * - Translations: import `t` from THIS package, not from
 *   `@molecule/app-i18n`. The re-exported `t` reads an internal Angular
 *   signal, so template bindings that CALL it (expose it on the component as
 *   above) re-evaluate automatically when the locale changes; the plain
 *   app-i18n `t` — or a one-time field assignment like `title = t(...)` —
 *   renders once and goes stale. The signal is bumped by `provideMolecule` —
 *   pass your `i18n` provider there (or call `bumpLocaleVersion()` from your
 *   own locale-change hook) for the reactivity to fire.
 * - **`t()` does NOT read the `i18n` you pass to `provideMolecule`.** It translates through
 *   the provider bonded in `@molecule/app-i18n` (`setProvider(...)`); `provideMolecule({ i18n })`
 *   only subscribes that provider's `onLocaleChange` to re-render. Bond and pass the SAME
 *   instance, or locale switches re-render with the wrong translations.
 * - Services are `providedIn: 'root'` but inject a token (`AUTH_CLIENT`, `THEME_PROVIDER`, ...):
 *   `inject(MoleculeAuthService)` fails with a NullInjectorError unless `auth` was provided.
 *   They expose RxJS observables (`user$`, `isAuthenticated$`, `mode$`) — render them with
 *   `AsyncPipe` (add it to the standalone component's `imports`).
 * - `provideMolecule` only registers the providers you pass; injecting a
 *   Molecule service whose token was never provided fails at DI time.
 *   Per-concern helpers (`provideAuth`, `provideTheme`, ...) exist for
 *   piecemeal setup.
 *
 * @module
 */

export * from './i18n-reactive.js'
export * from './providers.js'
export * from './services/index.js'
export * from './tokens.js'
export * from './types.js'

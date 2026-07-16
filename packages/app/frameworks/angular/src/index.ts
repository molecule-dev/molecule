/**
 * Angular framework bindings for molecule.dev.
 *
 * Provides Angular-specific services and providers for all molecule
 * core interfaces. This package enables the use of molecule's framework-agnostic
 * interfaces with Angular's idioms (services, DI, RxJS observables, etc.).
 *
 * @example
 * ```typescript
 * // main.ts — wire concrete providers into Angular DI:
 * import { bootstrapApplication } from '@angular/platform-browser'
 * import { provideMolecule } from '@molecule/app-angular'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideMolecule({
 *       state: stateProvider,
 *       auth: authClient,
 *       theme: themeProvider,
 *     }),
 *   ],
 * })
 *
 * // dashboard.component.ts — inject the Molecule services:
 * import { Component, inject } from '@angular/core'
 * import { MoleculeAuthService, MoleculeThemeService, t } from '@molecule/app-angular'
 *
 * @Component({
 *   selector: 'app-dashboard',
 *   template: `
 *     <div [style.background]="(theme$ | async)?.colors.background">
 *       <h1>{{ t('dashboard.welcome', {}, { defaultValue: 'Welcome!' }) }}</h1>
 *       <p>{{ (user$ | async)?.name }}</p>
 *       <button (click)="logout()">
 *         {{ t('auth.logout', {}, { defaultValue: 'Log out' }) }}
 *       </button>
 *     </div>
 *   `,
 * })
 * class DashboardComponent {
 *   // Expose the reactive t() so template bindings re-evaluate on locale change.
 *   protected readonly t = t
 *
 *   private authService = inject(MoleculeAuthService)
 *   private themeService = inject(MoleculeThemeService)
 *
 *   user$ = this.authService.user$     // Observable<UserProfile | null>
 *   theme$ = this.themeService.theme$  // Observable<Theme>
 *
 *   logout(): void {
 *     void this.authService.logout()
 *   }
 * }
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

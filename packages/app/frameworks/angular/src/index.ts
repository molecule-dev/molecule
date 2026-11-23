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
 * import { Component, inject } from '@angular/core'
 * import { bootstrapApplication } from '@angular/platform-browser'
 * import {
 *   MoleculeAuthService,
 *   MoleculeThemeService,
 *   provideMolecule,
 *   t,
 * } from '@molecule/app-angular'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 *
 * // dashboard.component.ts — inject the Molecule services:
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
 * export class DashboardComponent {
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
 *
 * // app.component.ts — the root that mounts the dashboard:
 * @Component({
 *   selector: 'app-root',
 *   imports: [DashboardComponent],
 *   template: '<app-dashboard />',
 * })
 * export class AppComponent {}
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
 * ```
 *
 * **Session restore:** `useAuth().status === 'loading'` is undecided: wait for
 * it and redirect only on `status === 'unauthenticated'`. `'unavailable'` keeps
 * the session candidate for retry, but `isAuthenticated` can be false and
 * `user` can be null. A restore failure other than 401/403 never signs out.
 * `provideMolecule({ auth })` starts the bundled client's restore when a
 * consumer first reads the session, so the app entry can mount its root without
 * calling `initialize()`. It holds bootstrap — and so every page's first
 * render — while a token-only or cookie-only restore is undecided; a cached
 * token and user, and a visitor without a session candidate, settle at once.
 * Pass `awaitSession: false` to render before the restore settles.
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
 * - The Molecule Angular components render through `provideDomPlacement()`,
 *   which `provideMolecule` includes. An app or test that mounts them without
 *   `provideMolecule` adds `provideDomPlacement()` to its providers; a component
 *   that needs it throws a message naming it. A component never moves a node
 *   Angular rendered (`appendChild`, `insertBefore`, `remove`): it uses
 *   `useHostPresence`, `setElementPresent`, `placeElement`, `placeContent` or
 *   `WrappedChildren`, which keep Angular's own inserts working (NG05106).
 * - In-app links use the `Link` directive (`<a molLink="/settings">`, `imports: [Link]`): it
 *   navigates through the molecule router with react-router `<Link>`'s click rules. A bare
 *   `<a href>` reloads the page; a hand-written `(click)` handler that calls `navigate()`
 *   breaks ctrl/cmd-click (new tab) unless it repeats those rules.
 *
 * @module
 */

export * from './agent-identity.js'
export * from './chat.js'
export * from './dom-placement.js'
export * from './hooks/index.js'
export * from './i18n-reactive.js'
export * from './link.js'
export * from './maybe-signal.js'
export * from './providers.js'
export * from './routed-view.js'
export * from './services/index.js'
export * from './session-ready.js'
export * from './tokens.js'
export * from './types.js'

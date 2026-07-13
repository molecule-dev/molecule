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
 * import { bootstrapApplication } from '@angular/platform-browser'
 * import { provideMolecule } from '@molecule/app-angular'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
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
 * // component.ts
 * import { inject } from '@angular/core'
 * import { MoleculeAuthService, MoleculeThemeService } from '@molecule/app-angular'
 *
 * @Component({
 *   selector: 'app-dashboard',
 *   template: `
 *     <div [style.background]="(theme$ | async)?.colors.background">
 *       <h1>Welcome, {{ (user$ | async)?.name }}!</h1>
 *       <button (click)="logout()">Logout</button>
 *     </div>
 *   `
 * })
 * class DashboardComponent {
 *   private authService = inject(MoleculeAuthService)
 *   private themeService = inject(MoleculeThemeService)
 *
 *   user$ = this.authService.user$
 *   theme$ = this.themeService.theme$
 *
 *   logout() {
 *     this.authService.logout()
 *   }
 * }
 * ```
 *
 * @module
 */

export * from './i18n-reactive.js'
export * from './providers.js'
export * from './services/index.js'
export * from './tokens.js'
export * from './types.js'

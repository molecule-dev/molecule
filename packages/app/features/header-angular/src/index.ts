/**
 * Angular top app-shell header — the counterpart of
 * `@molecule/app-header-react`: the same props and the same DOM for the same
 * input.
 *
 * Branded logo + appName on the left, slotted actions (theme toggle, extra
 * actions, user menu) on the right. Pair with
 * `@molecule/app-shell-layout-angular`'s `AppShellLayout` to assemble a full
 * chrome.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AppHeader } from '@molecule/app-header-angular'
 *
 * @Component({
 *   selector: 'app-shell',
 *   standalone: true,
 *   imports: [AppHeader],
 *   template: `
 *     <!-- UserMenu takes its settings panel as projected content; the panel
 *          dismisses the drawer via usePanelClose(). -->
 *     <header mol-app-header [appName]="'Bearing'">
 *       <app-user-menu slot="userMenu">
 *         <div>Your settings panel here</div>
 *       </app-user-menu>
 *     </header>
 *   `,
 * })
 * export class Shell {}
 * ```
 *
 * @remarks
 * - Must render inside the binding's router (`provideRouter`) — the brand
 *   link is the binding's `Link` (`<a molLink>`, react-router's `<Link>`
 *   contract), which throws outside one.
 * - The DEFAULT `themeToggle` slot renders `<button mol-theme-toggle>` (which
 *   calls `useTheme()` + `useTranslation()`) ONLY when BOTH the theme
 *   provider and the i18n provider are provided above the header — it probes
 *   them with `inject(THEME_PROVIDER/I18N_PROVIDER, { optional: true })`,
 *   which never throws. Without those providers the toggle is silently
 *   OMITTED instead of throwing, so `<header mol-app-header>` renders out of
 *   the box; it lights up automatically once they are wired. Bind the
 *   `themeToggle` input to `null` to force-hide it, or project your own
 *   `[slot=themeToggle]` content to override.
 * - `fixed` defaults to `true` (`cm.headerFixed` positions the header fixed):
 *   give the page content a matching top offset (flagships get it from
 *   `AppShellLayout`), or pass `fixed=false` for an in-flow header.
 * - `logoSrc` defaults to `/logo.svg`, the file mlcl scaffolds into `public/`.
 * - Styling routes through ClassMap tokens (`cm.headerBar`, `cm.headerFixed`,
 *   `cm.headerInner`, `cm.logoText`) — requires a bonded ClassMap.
 *
 * @module
 */

export * from './app-header.component.js'
export * from './types.js'

/**
 * Angular breadcrumb navigation component.
 *
 * Exports `Breadcrumb` — the Angular counterpart of
 * `@molecule/app-breadcrumb-react` with the same props and the same DOM:
 * a list of crumbs where each but the last is a link. The final crumb
 * renders as plain text with `aria-current="page"`. Pass `onNavigate` to
 * intercept clicks and hand off to a router.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { Breadcrumb } from '@molecule/app-breadcrumb-angular'
 *
 * @Component({
 *   selector: 'app-trail',
 *   standalone: true,
 *   imports: [Breadcrumb],
 *   template: `
 *     <nav
 *       mol-breadcrumb
 *       [items]="[
 *         { label: 'Home', to: '/' },
 *         { label: 'Projects', to: '/projects' },
 *         { label: 'Apollo Redesign' },
 *       ]"
 *       [onNavigate]="navigate"
 *     ></nav>
 *   `,
 * })
 * export class Trail {
 *   navigate = (to: string): void => {
 *     this.router.navigate([to])
 *   }
 * }
 * ```
 *
 * @remarks
 * - Without `onNavigate`, crumbs render as plain `<a href>` (full page
 *   load in SPAs) — pass `[onNavigate]` to stay client-side; with it,
 *   crumbs render as `<button>`s. The last item (or any item without
 *   `to`) renders as plain text with `aria-current="page"`. No router
 *   dependency is required by the component itself.
 * - The separator renders once per gap: project `[slot=separator]`
 *   content to replace the default `/` (the projected nodes are cloned
 *   into every gap — Angular projects a node once, React renders the same
 *   element in every gap).
 * - Node-valued fields (`label`, `icon`) accept `<ng-template>` refs or
 *   plain strings; a template renders in the crumb's icon/label row.
 *
 * @module
 */

export * from './breadcrumb.component.js'
export * from './types.js'

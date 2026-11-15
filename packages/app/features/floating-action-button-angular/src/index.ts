/**
 * Angular floating action button (FAB) — the counterpart of
 * `@molecule/app-floating-action-button-react`: the same props and the same
 * DOM for the same input.
 *
 * Exports `<FloatingActionButton>` — a fixed-position circular button (or
 * anchor when `href` is set) with an icon slot, native-title tooltip, and four
 * corner-anchoring positions.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { FloatingActionButton } from '@molecule/app-floating-action-button-angular'
 *
 * @Component({
 *   selector: 'app-create-fab',
 *   standalone: true,
 *   imports: [FloatingActionButton],
 *   template: `
 *     <div mol-floating-action-button label="Create new item" position="bottom-right" [onClick]="openCreate">
 *       <span slot="icon" aria-hidden="true">+</span>
 *     </div>
 *   `,
 * })
 * export class CreateFab {
 *   readonly createOpen = signal(false)
 *
 *   openCreate(): void {
 *     this.createOpen.set(true)
 *   }
 * }
 * ```
 *
 * @remarks
 * The FAB ships with a visible default surface — a primary gradient plus
 * soft elevation (the `gradientPrimary` + `shadowLifted` ClassMap tokens,
 * which also supply a contrasting `on-primary` icon color) — so an
 * out-of-the-box FAB is prominent in both light and dark themes with no
 * extra styling. Pass `className` to override it (e.g. `cm.surface`); caller
 * classes are merged last (tailwind-merge) so they win over the default.
 *
 * `label` doubles as an i18n key: it is resolved through
 * `t(label, {}, { defaultValue: label })`, so passing a translation key
 * localizes the aria-label / tooltip, and plain English strings still work as
 * their own fallback. The tooltip is the native `title` attribute (no styled
 * tooltip component).
 *
 * `href` and `onClick` are mutually exclusive — when `href` is set an `<a>`
 * renders and `onClick` is ignored. The `icon` prop is projected content
 * (`[slot=icon]`); every other prop keeps its React name.
 *
 * @module
 */

export * from './floating-action-button.component.js'
export * from './types.js'

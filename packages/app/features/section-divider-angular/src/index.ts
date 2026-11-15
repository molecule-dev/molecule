/**
 * Angular horizontal divider with optional centered label — the counterpart
 * of `@molecule/app-section-divider-react`: the same props and the same DOM
 * for the same input.
 *
 * Exports `SectionDivider`, common as "OR" between auth options, "Today"
 * between feed days, "—" between sections. The label is projected content —
 * translate it upstream.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { SectionDivider } from '@molecule/app-section-divider-angular'
 *
 * @Component({
 *   selector: 'app-example',
 *   standalone: true,
 *   imports: [SectionDivider],
 *   template: `
 *     <div mol-section-divider>OR</div>
 *     <div mol-section-divider [align]="'start'">Today</div>
 *   `,
 * })
 * export class Example {}
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (frame uses `cm.flex`, lines use `cm.flex1`) —
 *   rendering throws otherwise. No i18n dependency (the label is projected
 *   content — translate it upstream).
 * - `align` positions the label: `'center'` (default) draws lines on both
 *   sides; `'start'` / `'end'` put the label at that edge with a single
 *   line filling the rest.
 * - Lines use `currentColor` at 20% opacity, so they inherit the local text
 *   color in both light and dark themes.
 *
 * @module
 */

export * from './section-divider.component.js'
export * from './types.js'

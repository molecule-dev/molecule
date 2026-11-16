/**
 * Angular gradebook UI — unified table of grades + optional GPA hero card.
 *
 * Pairs with the `@molecule/api-resource-grade` resource. Rows can be courses
 * or assignments — the caller picks the granularity. The letter column renders
 * `Grade.letter` as plain text (string); pass pre-styled content via `title`
 * if you need richer cells.
 *
 * This is the Angular counterpart of `@molecule/app-gradebook-react`: the same
 * exports, the same props (React names), and the same DOM for the same input,
 * so an app switches framework by changing only the package name in its
 * imports. Node-valued props are projected content (`[slot=<name>]`) or plain
 * text.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 *
 * import { GpaCard, Gradebook } from '@molecule/app-gradebook-angular'
 *
 * @Component({
 *   selector: 'app-grades',
 *   standalone: true,
 *   imports: [GpaCard, Gradebook],
 *   template: `
 *     <div mol-gpa-card [gpa]="3.72" [scale]="'4.0'" [trend]="'up'"></div>
 *     <div mol-gradebook [grades]="rows" [gpaScale]="'4.0'"></div>
 *   `,
 * })
 * export class GradesPage {
 *   rows = [
 *     { id: 'g1', title: 'Algebra II', letter: 'A-', score: 92, weight: 0.25, contribution: 0.92 },
 *   ]
 * }
 * ```
 *
 * @remarks
 * All visible text routes through `t()` via the companion
 * `@molecule/app-locales-gradebook` locale bond. Both components call
 * `useTranslation()` from `@molecule/app-angular` (it falls back to the bonded
 * provider) and `getClassMap()` (requires a bonded ClassMap such as
 * `@molecule/app-ui-tailwind`) — wire both before rendering. No Tailwind
 * utilities appear in this package.
 *
 * @module
 */

export * from './gpa-card.component.js'
export * from './gradebook.component.js'
export * from './types.js'
export * from './utilities.js'

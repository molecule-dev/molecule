/**
 * Angular InfoCard and DefinitionList for structured label/value metadata.
 *
 * Exports:
 * - `<div mol-info-card>` — Card-wrapped DefinitionList with title, icon, actions.
 * - `<dl mol-definition-list>` — standalone label/value grid.
 * - `DefinitionField` type.
 *
 * This is the Angular counterpart of `@molecule/app-info-display-react`: the
 * same export names, the same props (React names), and the same DOM for the
 * same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { InfoCard } from '@molecule/app-info-display-angular'
 *
 * @Component({
 *   selector: 'app-company-details',
 *   standalone: true,
 *   imports: [InfoCard],
 *   template: `
 *     <div
 *       mol-info-card
 *       dataMolId="company-info-card"
 *       [columns]="2"
 *       [fields]="[
 *         { label: 'Industry', value: 'Technology' },
 *         { label: 'Founded', value: '2018' },
 *         { label: 'Employees', value: '120–150' }
 *       ]"
 *     >
 *       <h3 slot="title">Company Details</h3>
 *     </div>
 *   `,
 * })
 * export class CompanyDetails {}
 * ```
 *
 * @remarks
 * Purely presentational: pass already-formatted / already-translated content as
 * fields and projected slots. `getClassMap()` requires a bonded ClassMap (e.g.
 * `@molecule/app-ui-tailwind`) — there is no other wiring. `columns={1}` stacks
 * label above value; `2`/`3` arrange fields in a grid. Node props are projected
 * content: `title`, `icon` and `actions` are selected by `[slot=title]`,
 * `[slot=icon]` and `[slot=actions]`. A field's `label`, `value` and `icon`
 * take an `ng-template` reference or plain text.
 *
 * @module
 */

export * from './definition-list.component.js'
export * from './info-card.component.js'
export * from './types.js'

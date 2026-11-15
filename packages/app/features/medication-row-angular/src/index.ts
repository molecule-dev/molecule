/**
 * Angular medication record row — the counterpart of
 * `@molecule/app-medication-row-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<MedicationRow>` — drug name + dosage/form, instructions,
 * prescriber, days-of-supply and refills-remaining readouts, optional
 * pill-color dot and right-side actions.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { MedicationRow } from '@molecule/app-medication-row-angular'
 *
 * @Component({
 *   selector: 'app-medications',
 *   standalone: true,
 *   imports: [MedicationRow],
 *   template: `
 *     <div
 *       mol-medication-row
 *       name="Lisinopril"
 *       dosage="10mg"
 *       form="tablet"
 *       color="#4ade80"
 *       instructions="Take with water in the morning"
 *       prescriber="Dr. Sarah Chen"
 *       [supplyDays]="14"
 *       [refills]="2"
 *     >
 *       <button slot="actions" type="button">Mark taken</button>
 *     </div>
 *   `,
 * })
 * export class Medications {}
 * ```
 *
 * @remarks
 * - The "Prescribed by" / "N day supply" / "N refills" labels route through
 *   `t()` under the `medication.` prefix. The companion
 *   `@molecule/app-locales-medication-row` bond currently ships only
 *   `medication.prescribedBy` — `medication.supplyDays` and
 *   `medication.refills` fall back to English until the bond gains them.
 * - Fields you pass are rendered as-is (strings) — format dosage/dates and
 *   translate free text yourself.
 * - Node props are projected content: `name`, `dosage`, `form`,
 *   `instructions`, `prescriber` and `actions` are selected by
 *   `[slot=<name>]`; plain strings may also be passed as inputs.
 * - No `data-mol-id` prop. Renders inside the card styling of
 *   `@molecule/app-ui-angular`; a ClassMap bond must be wired.
 *
 * @module
 */

export * from './medication-row.component.js'
export * from './types.js'

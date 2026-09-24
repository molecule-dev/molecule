/**
 * Medication record row — drug name + dosage/form, instructions, prescriber,
 * days-of-supply and refills-remaining readouts, optional pill-color dot and
 * right-side actions.
 *
 * Exports `<MedicationRow>`. Props: `name`, `dosage?`, `form?`, `color?` (any
 * CSS color — renders a 24px dot), `instructions?`, `prescriber?`,
 * `supplyDays?`, `refills?`, `actions?` (Mark taken / Refill / Edit buttons),
 * `className?`. Used in medication-reminder, patient-facing health portals,
 * pharmacy dashboards.
 *
 * @remarks
 * - The "Prescribed by" / "N day supply" / "N refills" labels route through
 *   `t()` under the `medication.` prefix. The companion
 *   `@molecule/app-locales-medication-row` bond currently ships only
 *   `medication.prescribedBy` — `medication.supplyDays` and
 *   `medication.refills` fall back to English until the bond gains them.
 * - It is display-only: no dose scheduling, reminders, or "taken" tracking — keep that state
 *   yourself and put the buttons in `actions`.
 * - `supplyDays` / `refills` are plain counts with no pluralisation (`1 refills`) and are
 *   hidden only when `undefined` — `0` renders "0 refills".
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>`.
 * - Fields you pass are rendered as-is (ReactNode) — format dosage/dates and
 *   translate free text yourself.
 * - No `data-mol-id` prop. Renders inside `<Card>` from `@molecule/app-ui-react`;
 *   a ClassMap bond must be wired.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { MedicationRow } from '@molecule/app-medication-row-react'
 *
 * const medications = [
 *   { id: 'm1', name: 'Lisinopril', dosage: '10mg', form: 'tablet', color: '#4ade80', instructions: 'Take with water in the morning', prescriber: 'Dr. Sarah Chen', supplyDays: 14, refills: 2 },
 *   { id: 'm2', name: 'Metformin', dosage: '500mg', form: 'tablet', color: '#f5f5f4', instructions: 'Take with dinner', prescriber: 'Dr. Sarah Chen', supplyDays: 30, refills: 5 },
 * ]
 *
 * export function TodaysMedications() {
 *   const [taken, setTaken] = useState<string[]>([])
 *   return (
 *     <div>
 *       {medications.map(({ id, ...med }) => (
 *         <MedicationRow
 *           key={id}
 *           {...med}
 *           actions={
 *             <button type="button" disabled={taken.includes(id)} onClick={() => setTaken((ids) => [...ids, id])}>
 *               {taken.includes(id) ? 'Taken' : 'Mark taken'}
 *             </button>
 *           }
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './MedicationRow.js'

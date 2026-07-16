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
 * - Fields you pass are rendered as-is (ReactNode) — format dosage/dates and
 *   translate free text yourself.
 * - No `data-mol-id` prop. Renders inside `<Card>` from `@molecule/app-ui-react`;
 *   a ClassMap bond must be wired.
 *
 * @example
 * ```tsx
 * import { MedicationRow } from '@molecule/app-medication-row-react'
 *
 * <MedicationRow
 *   name="Lisinopril"
 *   dosage="10mg"
 *   form="tablet"
 *   color="#4ade80"
 *   instructions="Take with water in the morning"
 *   prescriber="Dr. Sarah Chen"
 *   supplyDays={14}
 *   refills={2}
 * />
 * ```
 * @module
 */

export * from './MedicationRow.js'

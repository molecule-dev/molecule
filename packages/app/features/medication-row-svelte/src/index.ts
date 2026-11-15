/**
 * Svelte medication record row — drug name + dosage/form, instructions,
 * prescriber, days-of-supply and refills-remaining readouts, optional
 * pill-color dot and right-side actions.
 *
 * Exports `MedicationRow` — the Svelte counterpart of
 * `@molecule/app-medication-row-react`'s `MedicationRow`: the same props
 * (React names), the same ClassMap styling, and the same DOM for the same
 * input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { MedicationRow } from '@molecule/app-medication-row-svelte'
 * </script>
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
 * >
 *   {#snippet actions()}
 *     <button type="button">Mark taken</button>
 *   {/snippet}
 * </MedicationRow>
 * ```
 *
 * @remarks
 * - The "Prescribed by" / "N day supply" / "N refills" labels route through
 *   `t()` under the `medication.` prefix. The companion
 *   `@molecule/app-locales-medication-row` bond currently ships only
 *   `medication.prescribedBy` — `medication.supplyDays` and
 *   `medication.refills` fall back to English until the bond gains them.
 * - Fields you pass are rendered as-is (snippets or strings) — format
 *   dosage/dates and translate free text yourself.
 * - No `data-mol-id` prop. Renders inside `Card` from `@molecule/app-ui-svelte`;
 *   a ClassMap bond must be wired.
 * - Node-valued props (`name`, `dosage`, `form`, `instructions`,
 *   `prescriber`, `actions`) are snippets or plain strings.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'

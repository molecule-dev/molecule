/**
 * React InfoCard and DefinitionList for structured label/value metadata.
 *
 * Exports:
 * - `<InfoCard>` — Card-wrapped DefinitionList with title, icon, actions.
 * - `<DefinitionList>` — standalone label/value grid.
 * - `DefinitionField` type.
 *
 * @example
 * ```tsx
 * import { InfoCard, DefinitionList } from '@molecule/app-info-display-react'
 *
 * <InfoCard
 *   title="Company Details"
 *   fields={[
 *     { label: 'Industry', value: 'Technology' },
 *     { label: 'Founded', value: '2018' },
 *     { label: 'Employees', value: '120–150' },
 *   ]}
 *   columns={2}
 *   dataMolId="company-info-card"
 * />
 * ```
 * @remarks
 * Purely presentational: pass already-formatted / already-translated
 * ReactNodes as labels and values. `getClassMap()` requires a bonded
 * ClassMap (e.g. `@molecule/app-ui-tailwind`) — there is no other wiring.
 * `columns={1}` stacks label above value; `2`/`3` arrange fields in a grid.
 *
 * @module
 */

export * from './DefinitionList.js'
export * from './InfoCard.js'

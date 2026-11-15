/**
 * Solid InfoCard and DefinitionList for structured label/value metadata.
 *
 * Exports:
 * - `<InfoCard>` — Card-wrapped DefinitionList with title, icon, actions.
 * - `<DefinitionList>` — standalone label/value grid.
 * - `DefinitionField` type.
 *
 * This is the Solid counterpart of `@molecule/app-info-display-react`: the same
 * export names, the same props (React names), and the same DOM for the same
 * input.
 *
 * @example
 * ```tsx
 * import { InfoCard } from '@molecule/app-info-display-solid'
 *
 * export function CompanyDetails() {
 *   return (
 *     <InfoCard
 *       title="Company Details"
 *       fields={[
 *         { label: 'Industry', value: 'Technology' },
 *         { label: 'Founded', value: '2018' },
 *         { label: 'Employees', value: '120–150' },
 *       ]}
 *       columns={2}
 *       dataMolId="company-info-card"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Purely presentational: pass already-formatted / already-translated nodes as
 * labels and values. `getClassMap()` requires a bonded ClassMap (e.g.
 * `@molecule/app-ui-tailwind`) — there is no other wiring. `columns={1}` stacks
 * label above value; `2`/`3` arrange fields in a grid.
 *
 * @module
 */

export * from './DefinitionList.jsx'
export * from './InfoCard.jsx'
export * from './types.js'

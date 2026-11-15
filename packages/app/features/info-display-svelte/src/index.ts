/**
 * Svelte InfoCard and DefinitionList for structured label/value metadata.
 *
 * Exports:
 * - `<InfoCard>` — Card-wrapped DefinitionList with title, icon, actions.
 * - `<DefinitionList>` — standalone label/value grid.
 * - `DefinitionField` type.
 *
 * This is the Svelte counterpart of `@molecule/app-info-display-react`: the
 * same export names, the same props (React names), and the same DOM for the
 * same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { InfoCard } from '@molecule/app-info-display-svelte'
 *
 *   const fields = [
 *     { label: 'Industry', value: 'Technology' },
 *     { label: 'Founded', value: '2018' },
 *     { label: 'Employees', value: '120–150' },
 *   ]
 * </script>
 *
 * <InfoCard title="Company Details" {fields} columns={2} dataMolId="company-info-card" />
 * ```
 *
 * @remarks
 * Purely presentational: pass already-formatted / already-translated nodes as
 * labels and values. `getClassMap()` requires a bonded ClassMap (e.g.
 * `@molecule/app-ui-tailwind`) — there is no other wiring. `columns={1}` stacks
 * label above value; `2`/`3` arrange fields in a grid. Node-valued props
 * (`title`, `icon`, `actions`, and each field's `label`/`value`/`icon`) take a
 * snippet, or plain text.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'

/**
 * Vue InfoCard and DefinitionList for structured label/value metadata.
 *
 * Exports:
 * - `<InfoCard>` — Card-wrapped DefinitionList with title, icon, actions.
 * - `<DefinitionList>` — standalone label/value grid.
 * - `DefinitionField` type.
 *
 * This is the Vue counterpart of `@molecule/app-info-display-react`: the same
 * export names, the same props (React names), and the same DOM for the same
 * input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { InfoCard } from '@molecule/app-info-display-vue'
 *
 * const Details = defineComponent({
 *   setup() {
 *     return () =>
 *       h(InfoCard, {
 *         title: 'Company Details',
 *         fields: [
 *           { label: 'Industry', value: 'Technology' },
 *           { label: 'Founded', value: '2018' },
 *           { label: 'Employees', value: '120–150' },
 *         ],
 *         columns: 2,
 *         dataMolId: 'company-info-card',
 *       })
 *   },
 * })
 *
 * createApp(Details).mount('#app')
 * ```
 *
 * @remarks
 * Purely presentational: pass already-formatted / already-translated nodes as
 * labels and values. `getClassMap()` requires a bonded ClassMap (e.g.
 * `@molecule/app-ui-tailwind`) — there is no other wiring. `columns={1}` stacks
 * label above value; `2`/`3` arrange fields in a grid. Node-valued props
 * (`title`, `icon`, `actions`) arrive as a prop AND a same-named slot;
 * components accept either.
 *
 * @module
 */

export * from './DefinitionList.js'
export * from './InfoCard.js'
export * from './types.js'

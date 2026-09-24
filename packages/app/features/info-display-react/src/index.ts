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
 * import { type DefinitionField, InfoCard } from '@molecule/app-info-display-react'
 * import { useTranslation } from '@molecule/app-react'
 * import { Button } from '@molecule/app-ui-react'
 *
 * export function CompanyDetails({ onEdit }: { onEdit: () => void }) {
 *   const { t } = useTranslation()
 *   const company = { industry: 'Technology', founded: new Date(Date.UTC(2018, 2, 14)), revenue: 12500000 }
 *   const fields: DefinitionField[] = [
 *     { label: 'Industry', value: company.industry },
 *     { label: 'Founded', value: company.founded.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) },
 *     { label: 'Annual revenue', value: company.revenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }) },
 *   ]
 *   return (
 *     <InfoCard
 *       title="Company details"
 *       fields={fields}
 *       columns={2}
 *       actions={
 *         <Button variant="ghost" size="sm" onClick={onEdit}>
 *           {t('common.edit', undefined, { defaultValue: 'Edit' })}
 *         </Button>
 *       }
 *       dataMolId="company-info-card"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Purely presentational: it does NOT format dates, numbers or currency and
 *   does NOT translate — pass already-formatted / already-translated
 *   ReactNodes as labels and values. `fields` items are `{ label, value, icon? }`
 *   (not `{ key, value }` or `{ name, value }`).
 * - Every field always renders its label ABOVE its value; `columns` only sets
 *   how many fields sit side by side (`1` = one per row, `2`/`3` = a grid).
 * - `getClassMap()` requires a bonded ClassMap (e.g.
 *   `@molecule/app-ui-tailwind`); `<InfoCard>` renders `Card` from
 *   `@molecule/app-ui-react` (a peer dependency). No i18n provider is needed.
 *
 * @module
 */

export * from './DefinitionList.js'
export * from './InfoCard.js'

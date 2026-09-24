/**
 * Selection-aware bulk action toolbar.
 *
 * Exports `<BulkActionToolbar>` and `BulkAction` type.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { BulkActionToolbar } from '@molecule/app-bulk-action-toolbar-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as bulkActionToolbarLocales from '@molecule/app-locales-bulk-action-toolbar'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(bulkActionToolbarLocales)
 *
 * export function MessageList() {
 *   const [messages, setMessages] = useState([
 *     { id: 'm1', subject: 'Invoice #1042' },
 *     { id: 'm2', subject: 'Team offsite' },
 *     { id: 'm3', subject: 'Weekly report' },
 *   ])
 *   const [selectedIds, setSelectedIds] = useState<string[]>([])
 *   const toggle = (id: string) =>
 *     setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
 *   const deleteSelected = () => {
 *     setMessages((list) => list.filter((m) => !selectedIds.includes(m.id)))
 *     setSelectedIds([])
 *   }
 *
 *   return (
 *     <I18nProvider provider={getI18nProvider()}>
 *       {messages.map((m) => (
 *         <label key={m.id}>
 *           <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggle(m.id)} />
 *           {m.subject}
 *         </label>
 *       ))}
 *       <BulkActionToolbar
 *         count={selectedIds.length}
 *         actions={[{ id: 'delete', label: 'Delete', onClick: deleteSelected, destructive: true }]}
 *         onClearSelection={() => setSelectedIds([])}
 *       />
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * Renders `null` while `count <= 0` — mount it unconditionally and drive
 * it from selection state. It does NOT track selection or pass ids to
 * actions: `onClick` takes no arguments, so close over your own selection
 * state (and clear it after a destructive action). `position` defaults to
 * `'sticky-bottom'` (16px inset, z-30); `'sticky-top'` and `'inline'` are
 * also supported. Destructive actions render as solid error-colored
 * buttons. The Clear button only renders when `onClearSelection` is passed.
 *
 * It calls `useTranslation()` from `@molecule/app-react` (throws without an
 * `I18nProvider` / `MoleculeProvider i18n` above it) and `getClassMap()`
 * (throws until `setClassMap(...)` ran). The Clear label comes from the
 * companion `@molecule/app-locales-bulk-action-toolbar` bond; the
 * "N selected" count (`bulkActions.selected`) is NOT in that bond and
 * renders its English default, and the region's `aria-label`
 * ("Bulk actions") is fixed English.
 *
 * @module
 */

export * from './BulkActionToolbar.js'

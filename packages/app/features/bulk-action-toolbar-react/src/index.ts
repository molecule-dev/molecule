/**
 * Selection-aware bulk action toolbar.
 *
 * Exports `<BulkActionToolbar>` and `BulkAction` type.
 *
 * @example
 * ```tsx
 * import { BulkActionToolbar } from '@molecule/app-bulk-action-toolbar-react'
 *
 * <BulkActionToolbar
 *   count={selectedIds.length}
 *   actions={[
 *     { id: 'delete', label: 'Delete', onClick: () => handleDelete(selectedIds), destructive: true },
 *     { id: 'export', label: 'Export', onClick: () => handleExport(selectedIds) },
 *   ]}
 *   onClearSelection={() => setSelectedIds([])}
 * />
 * ```
 *
 * @remarks
 * Renders `null` while `count <= 0` — mount it unconditionally and drive
 * it from selection state. `position` defaults to `'sticky-bottom'`
 * (16px inset, z-30); `'sticky-top'` and `'inline'` are also supported.
 * Destructive actions render as solid error-colored buttons. The count
 * label and Clear button are translated via the companion
 * `@molecule/app-locales-bulk-action-toolbar` locale bond.
 *
 * @module
 */

export * from './BulkActionToolbar.js'

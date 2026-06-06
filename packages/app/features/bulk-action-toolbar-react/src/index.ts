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
 * @module
 */

export * from './BulkActionToolbar.js'

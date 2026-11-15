/**
 * Solid selection-aware bulk action toolbar.
 *
 * Exports `BulkActionToolbar` and the `BulkAction` type — the Solid
 * counterpart of `@molecule/app-bulk-action-toolbar-react`: the same props
 * (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { BulkActionToolbar } from '@molecule/app-bulk-action-toolbar-solid'
 *
 * <BulkActionToolbar
 *   count={selectedIds().length}
 *   actions={[
 *     { id: 'delete', label: 'Delete', onClick: () => handleDelete(selectedIds()), destructive: true },
 *     { id: 'export', label: 'Export', onClick: () => handleExport(selectedIds()) },
 *   ]}
 *   onClearSelection={() => setSelectedIds([])}
 * />
 * ```
 *
 * @remarks
 * Renders nothing while `count <= 0` — mount it unconditionally and drive
 * it from selection state. `position` defaults to `'sticky-bottom'`
 * (16px inset, z-30); `'sticky-top'` and `'inline'` are also supported.
 * Destructive actions render as solid error-colored buttons. The count
 * label and Clear button are translated via `useTranslation()` (React's
 * exact keys and default values) and the companion
 * `@molecule/app-locales-bulk-action-toolbar` locale bond. An action's
 * node-valued fields (`label`, `icon`) are Solid JSX values.
 *
 * @module
 */

export * from './BulkActionToolbar.jsx'
export * from './types.js'

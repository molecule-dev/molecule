import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Column definition for a DataTableCard — specifies key, header, and cell renderer. */
export interface DataTableColumn<Row> {
  /** Stable key for React. */
  key: string
  /** Header label (usually `t('...')`). */
  header: ReactNode
  /** Render the cell for this column from a row. */
  cell: (row: Row) => ReactNode
  /** Optional extra `<th>` / `<td>` classes (e.g. `cm.textCenter`). */
  cellClassName?: string
  headerClassName?: string
}

interface DataTableCardProps<Row> {
  /** Optional title above the table chrome. */
  title?: ReactNode
  /** Right-aligned action / "View all" / link in the title row. */
  titleAction?: ReactNode
  /** Column definitions. */
  columns: ReadonlyArray<DataTableColumn<Row>>
  /** Rows to render. Falls back to `emptyMessage` if empty and not loading. */
  rows: ReadonlyArray<Row>
  /** Pull a stable React key from a row. */
  rowKey: (row: Row) => string
  /** When true, renders 5 skeleton rows instead of `rows`. */
  loading?: boolean
  /** Optional click handler per row. */
  onRowClick?: (row: Row) => void
  /** Empty-state content shown inside the tbody when not loading + rows is empty. */
  emptyMessage?: ReactNode
  /** Extra classes on the outer card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Drop-in card-shaped data table matching the polished flagship pattern.
 *
 * Renders:
 * 1. Optional title + action row
 * 2. Card-wrapped table with:
 *    - `bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm` outer
 *    - `bg-surface-container-low border-b border-outline-variant/10` thead
 *    - `text-[10px] font-black text-on-surface-variant uppercase tracking-widest` th
 *    - `divide-y divide-surface-container` tbody
 *    - `hover:bg-surface-container-low transition-colors` rows (when `onRowClick` provided)
 *    - 5-row pulsing skeleton when `loading`
 *    - Single full-width cell with `emptyMessage` when empty
 *
 * For complex per-column rendering, pass cells that compose
 * `<StatusBadge>`, `<Avatar>`, etc.
 * @param root0
 * @param root0.title
 * @param root0.titleAction
 * @param root0.columns
 * @param root0.rows
 * @param root0.rowKey
 * @param root0.loading
 * @param root0.onRowClick
 * @param root0.emptyMessage
 * @param root0.className
 * @param root0.dataMolId
 */
export function DataTableCard<Row>({
  title,
  titleAction,
  columns,
  rows,
  rowKey,
  loading = false,
  onRowClick,
  emptyMessage,
  className,
  dataMolId,
}: DataTableCardProps<Row>): JSX.Element {
  const cm = getClassMap()
  return (
    <section
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.stack(4),
        'bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm',
        className,
      )}
    >
      {(title !== undefined || titleAction !== undefined) && (
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 8),
            cm.sp('pt', 8),
          )}
        >
          {title !== undefined && (
            <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
              {title}
            </h3>
          )}
          {titleAction}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant/10">
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={cm.cn(
                    idx === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                    cm.sp('py', 4),
                    'text-[10px] font-black text-on-surface-variant uppercase tracking-widest',
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} aria-hidden="true">
                  <td colSpan={columns.length} className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                    <div
                      className={cm.cn(cm.h(4), 'bg-surface-container-low rounded animate-pulse')}
                    />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 12),
                    cm.textCenter,
                    'text-on-surface-variant',
                  )}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cm.cn(
                    onRowClick ? cm.cursorPointer : '',
                    'hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {columns.map((col, idx) => (
                    <td
                      key={col.key}
                      className={cm.cn(
                        idx === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                        cm.sp('py', 5),
                        col.cellClassName,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

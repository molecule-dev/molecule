import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, TableBox, TableCell, Text } from '@molecule/app-ui-react/elements'

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

/** Props for {@link DataTableCard}. */
export interface DataTableCardProps<Row> {
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
 * @param props - Component props (see {@link DataTableCardProps}).
 */
export function DataTableCard<Row>({
  title: titleProp,
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
  const title = slot(titleProp)
  const cm = getClassMap()
  return (
    <Box
      as="section"
      data-mol-id={dataMolId}
      className={cm.cn(cm.stack(4), cm.dataTableCardShell, className)}
    >
      {(title !== undefined || titleAction !== undefined) && (
        <Box
          as="div"
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 8),
            cm.sp('pt', 8),
          )}
        >
          {title !== undefined && (
            <Text
              as="h3"
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.dataTableCardTitle)}
            >
              {title}
            </Text>
          )}
          {titleAction}
        </Box>
      )}
      <Box as="div" className={cm.dataTableCardScroller}>
        <TableBox as="table" className={cm.cn(cm.w('full'), cm.dataTableCardTable)}>
          <TableBox as="thead">
            <TableBox as="tr" className={cm.dataTableCardHead}>
              {columns.map((col, idx) => (
                <TableCell
                  as="th"
                  key={col.key}
                  className={cm.cn(
                    idx === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                    cm.sp('py', 4),
                    cm.dataTableCardHeaderCell,
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </TableCell>
              ))}
            </TableBox>
          </TableBox>
          <TableBox as="tbody" className={cm.dataTableCardBody}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableBox as="tr" key={`skeleton-${i}`} aria-hidden="true">
                  <TableCell
                    as="td"
                    colSpan={columns.length}
                    className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}
                  >
                    <Box as="div" className={cm.cn(cm.h(4), cm.dataTableCardSkeletonBar)} />
                  </TableCell>
                </TableBox>
              ))
            ) : rows.length === 0 ? (
              <TableBox as="tr">
                <TableCell
                  as="td"
                  colSpan={columns.length}
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 12),
                    cm.textCenter,
                    cm.dataTableCardEmptyCell,
                  )}
                >
                  {emptyMessage}
                </TableCell>
              </TableBox>
            ) : (
              rows.map((row) => (
                <TableBox
                  as="tr"
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cm.cn(onRowClick ? cm.cursorPointer : '', cm.dataTableCardRowHover)}
                >
                  {columns.map((col, idx) => (
                    <TableCell
                      as="td"
                      key={col.key}
                      className={cm.cn(
                        idx === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                        cm.sp('py', 5),
                        col.cellClassName,
                      )}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableBox>
              ))
            )}
          </TableBox>
        </TableBox>
      </Box>
    </Box>
  )
}

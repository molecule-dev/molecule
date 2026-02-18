/**
 * Table component class generator for Svelte.
 *
 * @module
 */

import type { IconData } from '@molecule/app-icons'
import { getIcon } from '@molecule/app-icons'
import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating table classes.
 */
export interface TableClassOptions {
  bordered?: boolean
  className?: string
}

/**
 * Generate classes for the table element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import {
 *     getTableClasses, getTableHeaderClass, getTableBodyClass,
 *     getTableRowClasses, getTableHeadClasses, getTableCellClasses,
 *   } from '`@molecule/app-ui-svelte`'
 *   export let bordered = false
 *   export let striped = false
 *   export let hoverable = true
 *   $: tableClass = getTableClasses({ bordered })
 * </script>
 * <div class={cm.tableWrapper}>
 *   <table class={tableClass}>
 *     <thead class={getTableHeaderClass()}>
 *       <tr class={getTableRowClasses()}>
 *         {#each columns as col}
 *           <th class={getTableHeadClasses({ align: col.align, sortable: col.sortable })}>{col.header}</th>
 *         {/each}
 *       </tr>
 *     </thead>
 *     <tbody class={getTableBodyClass()}>
 *       {#each data as row, i}
 *         <tr class={getTableRowClasses({ striped, hoverable, index: i })}>
 *           {#each columns as col}
 *             <td class={getTableCellClasses({ align: col.align })}>{row[col.key]}</td>
 *           {/each}
 *         </tr>
 *       {/each}
 *     </tbody>
 *   </table>
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getTableClasses(options: TableClassOptions = {}): string {
  const { bordered = false, className } = options
  const cm = getClassMap()
  return cm.cn(cm.table, bordered && cm.tableBordered, className)
}

/**
 * Get the table header class string.
 *
 * @returns The table header class string.
 */
export function getTableHeaderClass(): string {
  return getClassMap().tableHeader
}

/**
 * Get the table body class string.
 *
 * @returns The table body class string.
 */
export function getTableBodyClass(): string {
  return getClassMap().tableBody
}

/**
 * Table wrapper class.
 *
 * @returns The table wrapper class string.
 */
export function getTableWrapperClass(): string {
  return getClassMap().tableWrapper
}

/**
 * Loading overlay class.
 * @returns The resulting string.
 */
export function getTableLoadingOverlayClass(): string {
  return getClassMap().tableLoadingOverlay
}

/**
 * Empty state cell class.
 * @returns The resulting string.
 */
export function getTableEmptyCellClass(): string {
  return getClassMap().tableEmptyCell
}

/**
 * Table wrapper class constant.
 *
 * @deprecated Use getTableWrapperClass() instead.
 */
export const tableWrapperClass = getClassMap().tableWrapper

/**
 * The table loading overlay class.
 *
 * @returns The result.
 */
export const tableLoadingOverlayClass = /* @__PURE__ */ getClassMap().tableLoadingOverlay

/**
 * Table empty cell class constant.
 *
 * @deprecated Use getTableEmptyCellClass() instead.
 */
export const tableEmptyCellClass = /* @__PURE__ */ getClassMap().tableEmptyCell

/**
 * Generate classes for a table row.
 *
 * @param options - The options.
 * @param options.striped - Whether striped row styling is enabled.
 * @param options.hoverable - Whether hover styling is enabled.
 * @param options.index - The row index for striped styling.
 * @param options.clickable - Whether the row is clickable.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getTableRowClasses(
  options: {
    striped?: boolean
    hoverable?: boolean
    index?: number
    clickable?: boolean
    className?: string
  } = {},
): string {
  const { striped = false, hoverable = false, index = 0, clickable = false, className } = options
  const cm = getClassMap()
  return cm.cn(
    cm.tableRow,
    striped && index % 2 === 1 && cm.tableRowStriped,
    hoverable && cm.tableRowHoverable,
    clickable && cm.tableRowClickable,
    className,
  )
}

/**
 * Generate classes for a table header cell.
 *
 * @param options - The options.
 * @param options.align - The text alignment of the header cell.
 * @param options.sortable - Whether the column is sortable.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getTableHeadClasses(
  options: {
    align?: 'left' | 'center' | 'right'
    sortable?: boolean
    className?: string
  } = {},
): string {
  const { align, sortable = false, className } = options
  const cm = getClassMap()
  return cm.cn(
    cm.tableHead,
    align === 'center' && cm.textCenter,
    align === 'right' && cm.textRight,
    sortable && cm.tableHeadSortable,
    className,
  )
}

/**
 * Generate classes for a table data cell.
 *
 * @param options - The options.
 * @param options.align - The text alignment of the cell.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getTableCellClasses(
  options: {
    align?: 'left' | 'center' | 'right'
    className?: string
  } = {},
): string {
  const { align, className } = options
  const cm = getClassMap()
  return cm.cn(
    cm.tableCell,
    align === 'center' && cm.textCenter,
    align === 'right' && cm.textRight,
    className,
  )
}

/**
 * Sort indicator container class.
 *
 * @returns The table sort wrapper class string.
 */
export function getTableSortWrapperClass(): string {
  return getClassMap().tableSortWrapper
}

/**
 * Sort icon class.
 *
 * @returns The table sort icon class string.
 */
export function getTableSortIconClass(): string {
  return getClassMap().tableSortIcon
}

/**
 * Table sort indicator class constant.
 *
 * @deprecated Use getTableSortWrapperClass() instead.
 */
export const tableSortIndicatorClass = /* @__PURE__ */ getClassMap().tableSortWrapper

/**
 * Table sort icon class constant.
 *
 * @deprecated Use getTableSortIconClass() instead.
 */
export const tableSortIconClass = /* @__PURE__ */ getClassMap().tableSortIcon

/**
 * Get icon data for a table sort direction indicator.
 *
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Icon data from the current icon set
 */
export function getSortIconData(direction: 'asc' | 'desc'): IconData {
  return getIcon(direction === 'asc' ? 'chevron-up' : 'chevron-down')
}

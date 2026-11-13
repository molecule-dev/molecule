<!--
  Table: sortable, stripable, hoverable data table with a loading overlay,
  an empty-state cell and per-column render functions (as render snippets)
  and header nodes.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { TableColumnSpec, TableProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'
  import ReactNode from './ReactNode.svelte'
  import Spinner from './Spinner.svelte'

  let {
    data,
    columns,
    rowKey,
    bordered,
    striped,
    hoverable = true,
    emptyContent,
    loading,
    sort,
    onSort,
    onRowClick,
    className,
    style,
    testId,
  }: TableProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())

  /** The key a row keeps across re-renders, as React's `key={getRowKey(row, index)}`. */
  const getRowKey = (row: Record<string, unknown>, index: number): string | number => {
    if (typeof rowKey === 'function') return rowKey(row)
    if (rowKey && row[rowKey] !== undefined) return row[rowKey] as string | number
    return index
  }

  const handleSort = (column: TableColumnSpec): void => {
    if (!column.sortable || !onSort) return
    const key = column.key as string
    const currentDirection = sort?.key === key ? sort.direction : undefined
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
    onSort(key, newDirection)
  }

  /**
   * Whether a column renderer is a snippet rather than a plain function: the
   * conformance kit's string-format render fns take only the call arguments
   * (length 0), while compiled snippets take the anchor first (length >= 1).
   */
  const isSnippet = (
    render: NonNullable<TableColumnSpec['render']>,
  ): render is Snippet<[unknown, Record<string, unknown>, number]> => render.length > 0

  const tableClasses = $derived(cm.cn(cm.table, bordered && cm.tableBordered, className))
</script>

<div class={cm.tableWrapper}>
  {#if loading}
    <div class={cm.tableLoadingOverlay}><Spinner size="lg" /></div>
  {/if}
  <table class={tableClasses} use:reactStyle={style} data-testid={testId}>
    <thead class={cm.tableHeader}>
      <tr class={cm.tableRow}>
        {#each columns as column (column.key as string)}
          <th
            class={cm.cn(
              cm.tableHead,
              column.align === 'center' && cm.textCenter,
              column.align === 'right' && cm.textRight,
              column.sortable && cm.tableHeadSortable,
            )}
            use:reactStyle={{ width: column.width }}
            onclick={() => column.sortable && handleSort(column)}
            aria-sort={column.sortable
              ? sort?.key === (column.key as string)
                ? sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
              : undefined}
          >
            <div class={cm.tableSortWrapper}>
              <ReactNode node={column.header} />
              {#if column.sortable && sort?.key === (column.key as string)}
                <span class={cm.tableSortIcon}>
                  {#if sort.direction === 'asc'}
                    <IconGlyph name="chevron-up" className={cm.iconSm} />
                  {:else}
                    <IconGlyph name="chevron-down" className={cm.iconSm} />
                  {/if}
                </span>
              {/if}
            </div>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class={cm.tableBody}>
      {#if data.length === 0}
        <tr>
          <td colspan={columns.length} class={cm.tableEmptyCell}>
            {#if emptyContent}<ReactNode node={emptyContent} />{:else}{t(
                'ui.table.empty',
                undefined,
                { defaultValue: 'No data available' },
              )}{/if}
          </td>
        </tr>
      {:else}
        {#each data as row, rowIndex (getRowKey(row, rowIndex))}
          <tr
            class={cm.cn(
              cm.tableRow,
              striped && rowIndex % 2 === 1 && cm.tableRowStriped,
              hoverable && cm.tableRowHoverable,
              onRowClick && cm.tableRowClickable,
            )}
            onclick={() => onRowClick?.(row, rowIndex)}
          >
            {#each columns as column (column.key as string)}
              <td
                class={cm.cn(
                  cm.tableCell,
                  column.align === 'center' && cm.textCenter,
                  column.align === 'right' && cm.textRight,
                )}
              >
                {#if column.render}
                  {#if isSnippet(column.render)}
                    {@render column.render(row[column.key as string], row, rowIndex)}
                  {:else}
                    {column.render(row[column.key as string], row, rowIndex)}
                  {/if}
                {:else}{row[column.key as string]}{/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

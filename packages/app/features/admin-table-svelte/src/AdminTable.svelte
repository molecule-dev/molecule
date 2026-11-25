<!--
  AdminTable: the Svelte counterpart of `@molecule/app-admin-table-react`'s
  `AdminTable` — generic data table with column defs, optional row-click
  navigation, bulk-select checkboxes, a kebab-menu row-actions column and a
  loading skeleton. Same props (React names), same DOM for the same input.
  Rows are keyed by `rowKey(row)` (React's `key={rowKey(row)}`), so a row keeps
  its DOM node while its key is unchanged.
-->
<script lang="ts" generics="T">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import AdminTableRowActions from './AdminTableRowActions.svelte'
  import { reflectChecked } from './dom.js'
  import type { ReactNodeProp } from './node-prop.js'
  import type { AdminTableColumn, AdminTableProps } from './types.js'

  let {
    rows,
    columns,
    rowKey,
    loading = false,
    skeletonRowCount = 8,
    onRowClick,
    bulkSelect = false,
    selectedIds = [],
    onSelectedIdsChange,
    rowActions,
    rowActionsAriaLabel,
    footer,
    className,
    tbodyDataMolId,
  }: AdminTableProps<T> = $props()

  const cm = $derived(getClassMap())
  // Read inside the markup, so the string follows a locale switch like every
  // other t() value.
  const { t } = useTranslation()
  let internalSelected = $state<string[]>([])

  const selected = $derived(onSelectedIdsChange ? selectedIds : internalSelected)
  const hasActions = $derived(!!rowActions && rowActions.length > 0)
  const totalColCount = $derived(columns.length + (bulkSelect ? 1 : 0) + (hasActions ? 1 : 0))

  const skeletonRows = $derived(Array.from({ length: skeletonRowCount }, (_unused, i) => i))

  /**
   * Applies a new selection: reports it in controlled mode, stores it
   * internally otherwise (React's `setSelected`).
   * @param next - The new ids.
   */
  function setSelected(next: string[]): void {
    if (onSelectedIdsChange) onSelectedIdsChange(next)
    else internalSelected = next
  }

  /**
   * Toggles one row's checkbox from a click, as React's controlled-input
   * `onChange` does — and, like React, restores the box in controlled mode
   * when the props do not change.
   * @param id - The row key.
   * @param event - The click event.
   */
  function toggle(id: string, event: MouseEvent): void {
    event.stopPropagation()
    const input = event.target as HTMLInputElement
    const ids = selected
    setSelected(input.checked ? [...ids, id] : ids.filter((value) => value !== id))
    // React restores a controlled input to its props value after the change.
    if (onSelectedIdsChange) input.checked = ids.includes(id)
  }

  /**
   * One cell's class list (React's alignment branch plus the column's own class).
   * @param column - The column.
   * @returns The class string.
   */
  function cellClass(column: AdminTableColumn<T>): string {
    return cm.cn(
      cm.sp('py', 4),
      cm.sp('px', 6),
      column.align === 'right' ? cm.textRight : column.align === 'center' ? cm.textCenter : '',
      column.className,
    )
  }
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value?.()}{:else if value !== undefined && value !== ''}{value}{/if}
{/snippet}

<div class={cm.cn(cm.card(), className)} style="overflow: hidden">
  <table class={cm.cn(cm.w('full'))} style="border-collapse: collapse">
    <thead>
      <tr class={cm.cn(cm.surfaceSecondary, cm.textMuted, cm.borderB)}>
        {#if bulkSelect}
          <th class={cm.cn(cm.sp('py', 3), cm.sp('px', 6), cm.w(8))}>
            <!-- The checkbox column has no visible header text; this names it. -->
            <span class={cm.cn(cm.srOnly)}>
              {t('adminTable.aria.selectColumn', undefined, { defaultValue: 'Select' })}
            </span>
          </th>
        {/if}
        {#each columns as column (column.id)}
          <th
            class={cm.cn(
              cm.sp('py', 3),
              cm.sp('px', 6),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.uppercase,
              cm.trackingWide,
              column.align === 'right'
                ? cm.textRight
                : column.align === 'center'
                  ? cm.textCenter
                  : '',
              column.headerClassName,
            )}
          >
            {@render node(column.header)}
          </th>
        {/each}
        {#if hasActions}
          <th class={cm.cn(cm.sp('py', 3), cm.sp('px', 6), cm.w(12), cm.textRight)}>
            <!-- The actions column has no visible header text; this names it. -->
            <span class={cm.cn(cm.srOnly)}>
              {t('adminTable.aria.actionsColumn', undefined, { defaultValue: 'Actions' })}
            </span>
          </th>
        {/if}
      </tr>
    </thead>
    <tbody data-mol-id={tbodyDataMolId}>
      {#if loading}
        {#each skeletonRows as rowIndex (rowIndex)}
          <tr class={cm.cn(cm.borderB)}>
            {#each Array.from({ length: totalColCount }) as _cell, cellIndex (cellIndex)}
              <td class={cm.cn(cm.sp('py', 4), cm.sp('px', 6))}>
                <div class={cm.cn(cm.h(4), cm.w(24), cm.skeleton())}></div>
              </td>
            {/each}
          </tr>
        {/each}
      {:else}
        {#each rows as row (rowKey(row))}
          <tr
            data-mol-id={`admin-table-row-${rowKey(row)}`}
            tabindex={onRowClick ? 0 : undefined}
            onclick={onRowClick ? () => onRowClick?.(row) : undefined}
            onkeydown={onRowClick
              ? (event: KeyboardEvent) => {
                  // A key pressed inside a row control (the checkbox, the
                  // actions trigger) belongs to that control and bubbles here;
                  // activate the row only for its own keys.
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onRowClick?.(row)
                  }
                }
              : undefined}
            class={cm.cn(cm.tableRow, onRowClick ? cm.tableRowClickable : '')}
          >
            {#if bulkSelect}
              <td class={cm.cn(cm.sp('py', 4), cm.sp('px', 6))}>
                <input
                  type="checkbox"
                  aria-label={t('adminTable.aria.selectRow', undefined, {
                    defaultValue: 'Select row',
                  })}
                  use:reflectChecked={selected.includes(rowKey(row))}
                  data-mol-id={`admin-table-select-${rowKey(row)}`}
                  onclick={(event: MouseEvent) => toggle(rowKey(row), event)}
                  class={cm.checkbox()}
                />
              </td>
            {/if}
            {#each columns as column (column.id)}
              <td class={cellClass(column)}>{@render column.render?.(row)}</td>
            {/each}
            {#if hasActions && rowActions}
              <td class={cm.cn(cm.sp('py', 4), cm.sp('px', 6), cm.textRight)}>
                <AdminTableRowActions
                  {row}
                  actions={rowActions}
                  stopActionPropagation={Boolean(onRowClick)}
                  ariaLabel={rowActionsAriaLabel?.(row)}
                />
              </td>
            {/if}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
  {@render node(footer)}
</div>

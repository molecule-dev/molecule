<!--
  DataTableCard: the Svelte counterpart of
  `@molecule/app-data-table-ui-react`'s `DataTableCard` — a card-wrapped data
  table with an optional title row, uppercase column headers, divided rows, a
  5-row loading skeleton and a single spanning empty cell. Same props (React
  names), same DOM for the same input. Rows are keyed by `rowKey(row)` (React's
  `key={rowKey(row)}`), so a row keeps its DOM node while its key is unchanged.
-->
<script lang="ts" generics="T">
  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ReactNodeProp } from './node-prop.js'
  import type { DataTableCardProps } from './types.js'

  let {
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
  }: DataTableCardProps<T> = $props()

  const cm = $derived(getClassMap())
  // React's `slot(title)`/`slot(titleAction)`: a `null`, `false` or `''` node is absent, so the row goes.
  const titleShown = $derived(
    title !== undefined && title !== null && title !== '' && typeof title !== 'boolean',
  )
  const headerShown = $derived(
    titleShown ||
      (titleAction !== undefined &&
        titleAction !== null &&
        titleAction !== '' &&
        typeof titleAction !== 'boolean'),
  )
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value?.()}{:else if value !== undefined && value !== ''}{value}{/if}
{/snippet}

<section data-mol-id={dataMolId} class={cm.cn(cm.stack(4), cm.dataTableCardShell, className)}>
  {#if headerShown}
    <PresentWhileContent
      tag="div"
      class={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.sp('pt', 8),
      )}
    >
      {#if titleShown}
        <PresentWhileContent
          tag="h3"
          class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.dataTableCardTitle)}
        >
          {@render node(title)}
        </PresentWhileContent>
      {/if}
      {@render node(titleAction)}
    </PresentWhileContent>
  {/if}
  <div class={cm.dataTableCardScroller}>
    <table class={cm.cn(cm.w('full'), cm.dataTableCardTable)}>
      <thead>
        <tr class={cm.dataTableCardHead}>
          {#each columns as column, index (column.key)}
            <th
              class={cm.cn(
                index === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                cm.sp('py', 4),
                cm.dataTableCardHeaderCell,
                column.headerClassName,
              )}
            >
              {@render node(column.header)}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class={cm.dataTableCardBody}>
        {#if loading}
          {#each [0, 1, 2, 3, 4] as index (index)}
            <tr aria-hidden="true">
              <td colspan={columns.length} class={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                <div class={cm.cn(cm.h(4), cm.dataTableCardSkeletonBar)}></div>
              </td>
            </tr>
          {/each}
        {:else if rows.length === 0}
          <tr>
            <td
              colspan={columns.length}
              class={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 12),
                cm.textCenter,
                cm.dataTableCardEmptyCell,
              )}
            >
              {@render node(emptyMessage)}
            </td>
          </tr>
        {:else}
          {#each rows as row (rowKey(row))}
            <tr
              onclick={onRowClick ? () => onRowClick?.(row) : undefined}
              class={cm.cn(onRowClick ? cm.cursorPointer : '', cm.dataTableCardRowHover)}
            >
              {#each columns as column, index (column.key)}
                <td
                  class={cm.cn(
                    index === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                    cm.sp('py', 5),
                    column.cellClassName,
                  )}
                >
                  {@render column.cell?.(row)}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</section>

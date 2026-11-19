<!--
  Test host for the Table sort test: the owner follows every reported sort,
  so clicking a sortable header flips the rendered `aria-sort` as well as
  reporting the new direction.
-->
<script lang="ts">
  import Table from '../components/Table.svelte'
  import type { TableColumnSpec } from '../types.js'

  let { onSort }: { onSort?: (key: string, direction: 'asc' | 'desc') => void } = $props()

  const columns: TableColumnSpec[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'age', header: 'Age' },
  ]
  const data: Record<string, unknown>[] = [
    { name: 'Ada', age: 36 },
    { name: 'Grace', age: 85 },
  ]

  let sort = $state<{ key?: string; direction?: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  })

  /**
   * Reports the requested sort and adopts it, like a controlled consumer.
   *
   * @param key - The column key.
   * @param direction - The requested direction.
   */
  const handleSort = (key: string, direction: 'asc' | 'desc'): void => {
    onSort?.(key, direction)
    sort = { key, direction }
  }
</script>

<Table {data} {columns} {sort} onSort={handleSort} />

<!--
  Test harness: a grid whose `cells` and `selection` the harness owns, so a
  test can drive it through user actions (the React suite's `Harness`).
-->
<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity'

  import type { CellMap, CellValue, SpreadsheetSelection } from '../index.js'
  import { SpreadsheetGrid } from '../index.js'

  let {
    initialCells,
    frozenRows,
    frozenCols,
    rows = 5,
    columns = 5,
    spy,
  }: {
    initialCells?: CellMap
    frozenRows?: number
    frozenCols?: number
    rows?: number
    columns?: number
    spy?: (ref: string, value: unknown) => void
  } = $props()

  // The harness seeds its own state from the starting props, once. A
  // `SvelteMap` is reactive by itself, so a committed edit mutates it in place
  // and the grid's derived layout sees the change.
  // svelte-ignore state_referenced_locally
  const cells = new SvelteMap<string, CellValue>(initialCells ?? [])
  let selection = $state<SpreadsheetSelection>({ r1: 0, c1: 0, r2: 0, c2: 0 })
</script>

<SpreadsheetGrid
  {rows}
  {columns}
  {cells}
  {selection}
  {frozenRows}
  {frozenCols}
  viewportWidth={400}
  viewportHeight={200}
  cellWidth={80}
  cellHeight={24}
  onCellChange={(ref, value) => {
    spy?.(ref, value)
    if (value === null) cells.delete(ref)
    else cells.set(ref, value)
  }}
  onSelectionChange={(next) => {
    selection = next
  }}
/>

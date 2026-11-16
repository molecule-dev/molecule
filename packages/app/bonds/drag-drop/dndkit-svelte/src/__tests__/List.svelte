<script lang="ts">
  import type { ConformanceListProps } from '@molecule/app-framework-conformance/drag-drop'

  import { SortableList } from '../index.js'
  import Row from './Row.svelte'

  let { disabledIds, ...options }: ConformanceListProps = $props()
</script>

<SortableList {...options}>
  <ul>
    {#each options.items as item (item.id)}
      <Row {item} disabled={disabledIds.includes(item.id)} />
    {/each}
  </ul>
</SortableList>

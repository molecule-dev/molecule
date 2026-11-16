<script lang="ts">
  import type { ConformanceItem } from '@molecule/app-framework-conformance/drag-drop'

  import { useSortableItem } from '../index.js'

  /** One row of the conformance list. */
  interface Props {
    /** The row's item. */
    item: ConformanceItem
    /** Whether the row's item is disabled. */
    disabled: boolean
  }

  let { item, disabled }: Props = $props()

  const { ref } = useSortableItem({ id: item.id, disabled })
</script>

<li data-row={item.id} {@attach ref}>{item.title}</li>

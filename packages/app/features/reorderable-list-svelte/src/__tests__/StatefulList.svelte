<!--
  Test host: the stateful wrapper the keyboard tests use — `onReorder`'s
  result feeds back into `items`, the way an app owns the order, so a move's
  focus settling can be asserted through real re-renders.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import ReorderableList from '../ReorderableList.svelte'
  import type { ReorderableItem } from '../types.js'

  interface Row {
    label: string
  }

  let {
    items: initial,
    renderItem,
  }: {
    items: ReorderableItem<Row>[]
    renderItem: Snippet<[ReorderableItem<Row>, boolean]>
  } = $props()

  // The prop is the seed only: an app hands the list its initial order, and
  // every later order comes back through `onReorder`.
  // svelte-ignore state_referenced_locally
  let items = $state(initial)
</script>

<ReorderableList
  {items}
  onReorder={(next: ReorderableItem<Row>[]) => (items = next)}
  {renderItem}
/>

<script lang="ts" generics="T extends { id: string }">
  /**
   * The Svelte sortable list.
   *
   * @module
   */

  import { DragDropProvider } from '@dnd-kit/svelte'
  import { setContext } from 'svelte'

  import {
    coreDragOver,
    coreDragStart,
    resolveSortableAxis,
    sortableListDrop,
    sortableListModifiers,
    sortableListPlugins,
    sortableListSensors,
  } from '@molecule/app-drag-drop-dndkit'

  import type { SortableListState } from './context.js'
  import { SORTABLE_LIST_CONTEXT } from './context.js'
  import ProviderSetup from './ProviderSetup.svelte'
  import type { SortableListProps } from './types.js'

  let {
    items,
    onReorder,
    axis,
    strategy,
    disabled = false,
    config,
    getItemLabel,
    onDragStart,
    onDragOver,
    onDragEnd,
    children,
  }: SortableListProps<T> = $props()

  const activationDelay = $derived(config?.activationDelay)
  const activationDistance = $derived(config?.activationDistance)
  const cancelOnEscape = $derived(config?.cancelOnEscape)
  const sensors = $derived(
    sortableListSensors({ activationDelay, activationDistance, cancelOnEscape }),
  )
  const resolvedAxis = $derived(resolveSortableAxis(axis, strategy))
  const modifiers = $derived(sortableListModifiers(resolvedAxis))

  // Built once per list, as the React binding's `useMemo(…, [])` does: the plugins hold the list's
  // identity and rewrite themselves on a locale change.
  const plugins = sortableListPlugins({
    labelOf: (id) => {
      const item = items.find((candidate) => candidate.id === id)
      return item && getItemLabel ? getItemLabel(item) : id
    },
    count: () => items.length,
  })

  // Getter-backed, so rows read the list's current `items` and `disabled`.
  const listState: SortableListState = {
    indexOf: (id) => items.findIndex((item) => item.id === id),
    get disabled() {
      return disabled
    },
  }
  setContext(SORTABLE_LIST_CONTEXT, listState)
</script>

<DragDropProvider
  {sensors}
  {modifiers}
  {plugins}
  onDragStart={(event) => {
    const started = coreDragStart(event.operation.source)
    if (started) onDragStart?.(started)
  }}
  onDragOver={(event) => {
    const over = coreDragOver(event.operation.source, event.operation.target)
    if (over) onDragOver?.(over)
  }}
  onDragEnd={(event) => {
    const drop = sortableListDrop(items, event, disabled)
    if (drop.event) onDragEnd?.(drop.event)
    if (drop.reordered) onReorder(drop.reordered)
  }}
>
  <!-- Runs before the rows and hands the manager this list's own plugins, sensors and modifiers. -->
  <ProviderSetup {sensors} {modifiers} />
  {@render children()}
</DragDropProvider>

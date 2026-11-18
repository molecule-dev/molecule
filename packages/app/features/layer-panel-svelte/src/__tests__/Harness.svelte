<!--
  Test harness for the ported `LayerPanel` unit suite: owns the layer list and
  the active id in `$state`, exactly as the React suite's `Harness` component
  owns them in `useState`, and forwards the callbacks the tests spy on.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import LayerPanel from '../LayerPanel.svelte'
  import type { Layer } from '../types.js'

  let {
    initial,
    onReorderSpy,
    onVisibilityToggleSpy,
    onLockToggleSpy,
    onSelectSpy,
    onRenameSpy,
  }: {
    initial?: Layer[]
    onReorderSpy?: (next: Layer[]) => void
    onVisibilityToggleSpy?: (id: string) => void
    onLockToggleSpy?: (id: string) => void
    onSelectSpy?: (id: string) => void
    onRenameSpy?: (id: string, name: string) => void
  } = $props()

  let layers = $state<Layer[]>(
    untrack(
      () =>
        initial ?? [
          { id: 'top', name: 'Top', visible: true, locked: false, opacity: 1, blendMode: 'normal' },
          { id: 'mid', name: 'Mid', visible: true, locked: false, opacity: 0.5 },
          { id: 'bot', name: 'Bot', visible: false, locked: true },
        ],
    ),
  )
  let activeId = $state<string | undefined>(undefined)
</script>

<LayerPanel
  {layers}
  {activeId}
  onReorder={(next) => {
    onReorderSpy?.(next)
    layers = next
  }}
  onVisibilityToggle={(id) => {
    onVisibilityToggleSpy?.(id)
    layers = layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
  }}
  onLockToggle={(id) => {
    onLockToggleSpy?.(id)
    layers = layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
  }}
  onSelect={(id) => {
    onSelectSpy?.(id)
    activeId = id
  }}
  onRename={(id, name) => {
    onRenameSpy?.(id, name)
    layers = layers.map((l) => (l.id === id ? { ...l, name } : l))
  }}
/>

<!--
  WorkspaceLayout: the Svelte counterpart of `@molecule/app-ide-react`'s
  `WorkspaceLayout` — the IDE workspace row of resizable panes. Same DOM for
  the same input, same callbacks. The panes are data: `items` holds one entry
  per pane and the `children` snippet renders one entry; this component's own
  `{#each}` renders each pane's wrapper and the divider that follows it. A
  draggable vertical divider follows each pane but the last, and every divider
  resizes its left panel. Only the trailing pane flex-grows — every leading
  pane keeps its `flex-basis` exactly, so a drag moves its edge 1:1 with the
  pointer. See the React file for the design notes.

  Svelte places every node: the wrapper and the pane's content are rendered by
  the same `{#each}` iteration, so a pane that appears after mount lands
  already wrapped and nothing the framework rendered is moved or detached.
  Styles Svelte writes as attribute text, so the pane geometry is written as
  the `flex` shorthand cssstyle composes from React's three longhands; that
  keeps the serialized attribute identical.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are that
  geometry and the root's overflow/min-height. All user-facing text goes
  through `t()` (the nested `ResizeHandle`).
-->

<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/props.ts). */
  export type WorkspaceLayoutProps<T = unknown> = types.WorkspaceLayoutProps<T>
</script>

<script lang="ts" generics="T">
  import type { PanelConfig } from '@molecule/app-ide'
  import { clampPanelSize, livePanelSize } from '@molecule/app-ide-panel-logic'
  import { useWorkspace } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ResizeHandle from './ResizeHandle.svelte'

  let { items = [], children, className }: WorkspaceLayoutProps<T> = $props()

  const cm = getClassMap()
  const { layout, resizePanel } = useWorkspace()

  /** How many panes render — React's `panels.length`. */
  const count = $derived(items.length)

  /** The visible panel configs taken one per rendered pane, in order. */
  const panelConfigs = $derived(
    $layout.panels.filter((panel) => panel.visible !== false).slice(0, count),
  )

  /**
   * Resizes the panel before divider `index` by a pixel delta: reads the
   * panel's live size, clamps the change against the layout container's
   * measured width (1000 when the DOM reports none) and writes the new
   * percentage back through the workspace provider.
   *
   * @param index - The divider's index (the panel it follows).
   * @param delta - The pixels moved since the last move.
   */
  function handleResize(index: number, delta: number): void {
    const configs: PanelConfig[] = panelConfigs
    const config = configs[index]
    if (!config) return
    const containerWidth = document.querySelector('[data-workspace-layout]')?.clientWidth || 1000
    const currentSize = livePanelSize($layout, configs, index)
    const newSize = clampPanelSize(currentSize, delta, containerWidth)
    resizePanel(config.id, newSize)
  }

  /**
   * The leading pane's share (percent) of the two panes a divider separates —
   * the value a focusable separator reports as `aria-valuenow`.
   * @param index - The divider's index (the pane before it).
   * @returns The leading pane's share of the pair, 0–100.
   */
  function leadingShare(index: number): number {
    const lead = livePanelSize($layout, panelConfigs, index)
    const trail = livePanelSize($layout, panelConfigs, index + 1)
    const total = lead + trail
    return total > 0 ? (lead / total) * 100 : 50
  }

  /**
   * The pane's inline geometry: its size as the flex basis, and whether it is
   * the trailing pane that absorbs the leftover space.
   *
   * @param index - The pane's index in the row.
   * @returns The `style` attribute text (the shorthand jsdom serializes
   * React's longhands into).
   */
  function panelStyle(index: number): string {
    const size = livePanelSize($layout, panelConfigs, index)
    const grow = index === count - 1 ? 1 : 0
    return `flex: ${grow} ${grow} ${size}%; min-width: 0px; overflow: hidden; position: relative`
  }
</script>

<div
  data-workspace-layout=""
  class={cm.cn(cm.flex({ direction: 'row' }), cm.w('full'), cm.h('full'), className)}
  style="overflow: hidden; min-height: 0px"
>
  {#each items as item, i (i)}
    <div class={cm.flex({ direction: 'col' })} style={panelStyle(i)}>
      {@render children?.(item, i)}
    </div>
    {#if i < count - 1}
      <!-- A divider between this pane and the next, a direct flex-row
          sibling so it spans the full height. -->
      <ResizeHandle
        direction="horizontal"
        value={leadingShare(i)}
        onResize={(delta) => handleResize(i, delta)}
      />
    {/if}
  {/each}
</div>

<!--
  WorkspaceLayout: the Svelte counterpart of `@molecule/app-ide-react`'s
  `WorkspaceLayout` — the IDE workspace row of resizable panes. Same props
  (React names), same DOM for the same input, same callbacks. Children (the
  `children` snippet) are arranged in a row; a draggable vertical divider
  follows each pane but the last, and every divider resizes its left panel.
  Only the trailing pane flex-grows — every leading pane keeps its
  `flex-basis` exactly, so a drag moves its edge 1:1 with the pointer. See the
  React file for the design notes.

  A Svelte snippet renders as one unit, so the panes cannot be projected into
  their own wrappers by the template: the snippet renders once as the host's
  direct children and an effect moves each element node into the wrapper the
  `{#each}` rendered for it (a text child — which React's
  `Children.toArray(...).filter(isValidElement)` drops — is removed, not
  wrapped). Styles Svelte writes as attribute text, so the pane geometry is
  written as the `flex` shorthand cssstyle composes from React's three
  longhands; that keeps the serialized attribute identical.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are that
  geometry and the root's overflow/min-height. All user-facing text goes
  through `t()` (the nested `ResizeHandle`).
-->

<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/props.ts). */
  export type WorkspaceLayoutProps = types.WorkspaceLayoutProps
</script>

<script lang="ts">
  import type { PanelConfig } from '@molecule/app-ide'
  import { clampPanelSize, livePanelSize } from '@molecule/app-ide-panel-logic'
  import { useWorkspace } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ResizeHandle from './ResizeHandle.svelte'

  let { children, className }: WorkspaceLayoutProps = $props()

  const cm = getClassMap()
  const { layout, resizePanel } = useWorkspace()

  /** The row's root (the host the panes are wrapped inside). */
  let hostEl: HTMLElement
  /** The pane nodes taken out of the snippet's render position, in order. */
  let panes: Node[] = []
  /** Whether the snippet's rendered nodes have been taken into {@link panes}. */
  let captured = false
  /** How many panes render — the wrapper/handle count, known after the snippet renders. */
  let count = $state(0)

  /** One pane per wrapper the template renders. */
  const indexes = $derived(Array.from({ length: count }, (_, i) => i))

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

  // Takes the snippet's element children, then moves each into its wrapper.
  // The first pass has no wrappers yet (the pane count is unknown until the
  // snippet renders), so it captures and sets the count; the state change
  // re-renders the wrappers and the second pass places the panes.
  $effect(() => {
    const total = count
    if (!hostEl) return
    if (!captured) {
      const elements: Node[] = []
      for (const node of Array.from(hostEl.childNodes)) {
        if (node.nodeType === 1) elements.push(node)
        // React drops a text child (it is not an element); the snippet's own
        // text nodes go with it.
        else if (node.nodeType === 3) node.remove()
      }
      captured = true
      panes = elements
      count = elements.length
      return
    }
    if (total === 0) return
    // The template renders the wrappers and dividers first, in order (wrapper,
    // divider, wrapper, …), and the panes after them; a wrapper is every even
    // direct child. Reading the order avoids naming the wrappers with an
    // attribute React's DOM does not have.
    const rendered = Array.from(hostEl.children) as HTMLElement[]
    panes.forEach((node, i) => {
      const wrapper = rendered[i * 2]
      if (wrapper && node.parentNode !== wrapper) wrapper.appendChild(node)
    })
  })
</script>

<div
  bind:this={hostEl}
  data-workspace-layout=""
  class={cm.cn(cm.flex({ direction: 'row' }), cm.w('full'), cm.h('full'), className)}
  style="overflow: hidden; min-height: 0px"
>
  {#each indexes as i (i)}
    <div class={cm.flex({ direction: 'col' })} style={panelStyle(i)}></div>
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
  {#if children}{@render children()}{/if}
</div>

<!--
  The work tray: one full-width row of chips — plan, background tasks, tests,
  uncommitted files — that sits UNDER the composer's rounded top edge like a
  layer behind it. Each section is a `DockStrip` that draws its chip into the
  row and, when its chip is open, its detail below it; one section is open at
  a time. The tray has a top, left and right border and no bottom edge: the
  composer is drawn over its lower 8px.

  Svelte counterpart of `@molecule/app-ide-react`'s `WorkCard` (see that file
  for the design notes): the same DOM for the same input, the same tray state.
  The strips are the `children` snippet; the tray provides `WorkTrayContext`
  (one `$state` object, as the Svelte `DockStrip` reads it) and renders the
  header element, the detail element and the snippet inside one bordered
  frame. The component is a part (React renders it inside ChatPanel without
  exporting it), so it lives in `src/parts/`.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express.
-->
<script module lang="ts">
  import type { Snippet } from 'svelte'

  /** Props for `WorkCard` — the React prop names, React's own contract. */
  export interface WorkCardProps {
    /** The sections (strips). */
    children?: Snippet
  }
</script>

<script lang="ts">
  import { setContext } from 'svelte'

  import { useThemeMode } from '@molecule/app-svelte'

  import { WorkTrayContext, type WorkTrayValue } from './DockStrip.svelte'

  let { children }: WorkCardProps = $props()

  const mode = useThemeMode()
  const isLight = $derived($mode === 'light')

  // The tray's shared state: which section is open, and where the strips draw
  // their chips and open details. One `$state` object, so a change re-renders
  // every strip in it.
  const tray: WorkTrayValue = $state({
    headerEl: null,
    detailEl: null,
    openId: null,
    toggle(id: string): void {
      tray.openId = tray.openId === id ? null : id
    },
  })
  setContext(WorkTrayContext, tray)
</script>

<div
  data-mol-id="work-card"
  style={`flex-shrink: 0; position: relative; box-sizing: border-box; margin-bottom: -8px; padding-bottom: 8px; border-radius: 8px 8px 0 0; border: 1px solid ${isLight ? '#d0d7de' : '#3d444d'}; border-bottom: none; background: ${isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)'}`}
>
  <div
    bind:this={tray.headerEl}
    style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 10px"
  ></div>
  <div bind:this={tray.detailEl} style="max-height: 220px; overflow-y: auto"></div>
  {#if children}{@render children()}{/if}
</div>

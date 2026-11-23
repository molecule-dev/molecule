<!--
  EditorLayout: the Svelte counterpart of `@molecule/app-editor-layout-react`'s
  `EditorLayout` — sticky top bar → main canvas → optional side panel. Same
  props, same DOM for the same input; the top bar, canvas and side panel are
  snippet slots.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { EditorLayoutProps } from './types.js'

  let {
    topBar,
    canvas,
    sidePanel,
    sidePanelPosition = 'right',
    sidePanelOpen = true,
    className,
    dataMolId,
  }: EditorLayoutProps = $props()

  const cm = $derived(getClassMap())
</script>

<div
  class={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'), className)}
  data-mol-id={dataMolId}
>
  <div style="position: sticky; top: 0px; z-index: 10">
    {#if topBar}{@render topBar?.()}{/if}
  </div>
  <div class={cm.cn(cm.flex({ align: 'stretch' }), cm.flex1)}>
    {#if sidePanel && sidePanelOpen && sidePanelPosition === 'left'}
      <aside class={cm.shrink0}>{@render sidePanel?.()}</aside>
    {/if}
    <main class={cm.flex1}>
      {#if canvas}{@render canvas?.()}{/if}
    </main>
    {#if sidePanel && sidePanelOpen && sidePanelPosition === 'right'}
      <aside class={cm.shrink0}>{@render sidePanel?.()}</aside>
    {/if}
  </div>
</div>

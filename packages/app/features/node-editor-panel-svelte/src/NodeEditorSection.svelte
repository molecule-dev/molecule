<!--
  NodeEditorSection: the Svelte counterpart of
  `@molecule/app-node-editor-panel-react`'s `NodeEditorSection` — a labeled
  section inside the properties panel (canonical 11px uppercase-tracking-widest
  label) with an optional trailing node on the right of the label row. Same
  props (React names), same ClassMap tokens, same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { NodeEditorSectionProps } from './types.js'
  import { renders } from './utilities.js'

  let { label, children, trailing, gap = 3, htmlFor }: NodeEditorSectionProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.stack(gap)}>
  <div class={cm.flex({ justify: 'between', align: 'center' })}>
    <label for={htmlFor} class={cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelSectionLabel)}>
      {#if typeof label === 'function'}{@render label()}{:else}{label}{/if}
    </label>
    {#if renders(trailing)}
      {#if typeof trailing === 'function'}{@render trailing()}{:else}{trailing}{/if}
    {/if}
  </div>
  {#if children}{@render children()}{/if}
</div>

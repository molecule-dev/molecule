<!--
  React's section “JSX from `{modelPicker &&`” (ChatPanel.tsx lines 6270–6287):
  the `/model` picker's anchored popup shell. It renders only while the picker
  is open AND it has something to show (the catalog still loading, models to
  list, or deprecated models to expand). The column layout is the picker's own:
  the header and the BYO footer keep their height while the middle list
  scrolls, and the popup is capped at the shared popup height.

  View only: the open state, the catalog and the model lists come from the
  slices through `ctx`.
-->
<script lang="ts">
  import ChatModelPickerByo from './ChatModelPickerByo.svelte'
  import ChatModelPickerHeader from './ChatModelPickerHeader.svelte'
  import ChatModelPickerRows from './ChatModelPickerRows.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()
</script>

{#if ctx.composer.modelPicker && (ctx.models.modelsLoading || ctx.pickers.visibleModels.length > 0 || ctx.pickers.deprecatedModels.length > 0)}
  <div
    class={ctx.env.cm.cn(ctx.env.cm.surface, ctx.env.cm.borderAll)}
    style="position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 0; border-radius: 6px 6px 0 0; z-index: 100; box-shadow: 0 -4px 16px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: {ctx
      .env.popupMaxHeight}"
  >
    <ChatModelPickerHeader {ctx} />
    <ChatModelPickerRows {ctx} />
    <ChatModelPickerByo {ctx} />
  </div>
{/if}

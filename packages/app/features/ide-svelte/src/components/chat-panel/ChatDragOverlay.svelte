<!--
  React's section “Drag overlay — covers entire chat area” (ChatPanel.tsx): the
  full-panel translucent target shown while a file drag is over the chat, with
  the theme-aware "Drop files here" pill. Rendered as the panel root's first
  child, above the messages.

  View only: the drag state comes from the attachments slice through `ctx`.
-->
<script lang="ts">
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()
</script>

{#if ctx.attachments.isDragOver}
  <div
    style="position: absolute; inset: 0px; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(64,112,224,0.2); border: 2px dashed rgba(64,112,224,0.5); border-radius: 6px; pointer-events: none"
  >
    <span
      class={ctx.env.cm.textSize('sm')}
      style="padding: 12px 24px; border-radius: 8px; font-weight: 600; background: {ctx.env
        .themeMode === 'dark'
        ? 'rgba(255,255,255,0.9)'
        : 'rgba(0,0,0,0.75)'}; color: {ctx.env.themeMode === 'dark'
        ? '#1a1a1a'
        : '#fff'}; box-shadow: 0 2px 12px rgba(0,0,0,0.2)"
    >
      {ctx.env.t('ide.chat.dropFilesHere', undefined, { defaultValue: 'Drop files here' })}
    </span>
  </div>
{/if}

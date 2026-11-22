<!--
  React's section “File attachment chips” (ChatPanel.tsx): the wrapped row of
  staged attachment chips above the composer. Each chip shows an image preview
  when the file is an image, its basename in monospace, its size when known, and
  a remove ✕ that also revokes the preview URL.

  View only: the staged files, the remove action and the coarse-pointer floor
  come from the slices through `ctx`.
-->
<script lang="ts">
  import { formatSize } from '@molecule/app-ide-panel-logic'

  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()
</script>

{#if ctx.popups.attachedFiles.length > 0}
  <div style="display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 10px 0">
    {#each ctx.popups.attachedFiles as f (f.path ?? f.filename)}
      {@const key = f.path ?? f.filename}
      {@const name = f.path ? f.path.split('/').pop() : f.filename}
      <span
        class={ctx.env.cm.cn(ctx.env.cm.surfaceSecondary, ctx.env.cm.textSize('xs'))}
        style="display: inline-flex; align-items: center; gap: 4px; border-radius: 4px; padding: 2px 6px"
      >
        {#if f.previewUrl}
          <img
            src={f.previewUrl}
            alt={f.filename}
            style="width: 18px; height: 18px; object-fit: cover; border-radius: 2px"
          />
        {/if}
        <span style="font-family: monospace; opacity: 0.85">{name}</span>
        {#if f.size > 0}
          <span class={ctx.env.cm.textMuted} style="font-size: 10px">{formatSize(f.size)}</span>
        {/if}
        <button
          type="button"
          data-mol-id="chat-attachment-remove-{key}"
          aria-label={ctx.env.t(
            'ide.chat.removeAttachment',
            { name: name ?? f.filename },
            { defaultValue: 'Remove {{name}}' },
          )}
          onclick={() => ctx.attachments.removeAttachment(key)}
          style="border: none; cursor: pointer; color: inherit; opacity: 0.5; line-height: 1; padding: 0; font-size: 13px; background: none"
          style:display={ctx.env.isCoarse ? 'inline-flex' : null}
          style:align-items={ctx.env.isCoarse ? 'center' : null}
          style:justify-content={ctx.env.isCoarse ? 'center' : null}
          style:min-width={ctx.env.isCoarse ? '32px' : null}
          style:min-height={ctx.env.isCoarse ? '32px' : null}
        >
          ×
        </button>
      </span>
    {/each}
  </div>
{/if}

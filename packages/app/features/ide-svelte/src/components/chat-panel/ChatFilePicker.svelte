<!--
  React's section “File picker popup” (ChatPanel.tsx): the `@` file picker
  anchored above the composer. One full-width row per ranked entry: the
  monospace basename, the muted directory when the entry is nested, and an
  `active` / `open` badge for the editor's focused file or an open tab.

  View only: the picker and its ranked entries come from the popups and pickers
  slices; the row pick is the render-handlers slice's stable callback.
-->
<script lang="ts">
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  /**
   * React's `normalizeTabPath`: a tab or active-file path as the picker's
   * project-relative entry name.
   *
   * @param p - The tab or active-file path.
   * @returns The path without its `/workspace/` or leading `/` prefix.
   */
  function normalizeTabPath(p: string): string {
    return p.startsWith('/workspace/')
      ? p.slice('/workspace/'.length)
      : p.startsWith('/')
        ? p.slice(1)
        : p
  }
</script>

{#if ctx.popups.filePicker && ctx.pickers.filteredEntries.length > 0}
  {@const activeNorm = ctx.props.activeFile ? normalizeTabPath(ctx.props.activeFile) : null}
  {@const openTabSet = new Set((ctx.props.openTabs ?? []).map(normalizeTabPath))}
  <div
    class={ctx.env.cm.cn(ctx.env.cm.surface, ctx.env.cm.borderAll)}
    style="position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 0; border-radius: 6px 6px 0 0; overflow: hidden; z-index: 100; box-shadow: 0 -4px 16px rgba(0,0,0,0.25); max-height: {ctx
      .env.popupMaxHeight}; overflow-y: auto"
  >
    {#each ctx.pickers.filteredEntries as entry, idx (entry.name)}
      {@const fileName = entry.name.split('/').pop() ?? entry.name}
      {@const dirPath = entry.name.includes('/')
        ? entry.name.slice(0, entry.name.lastIndexOf('/'))
        : ''}
      {@const isActive = activeNorm === entry.name}
      {@const isOpenTab = !isActive && openTabSet.has(entry.name)}
      <!-- React's `border: none` plus `borderTop` reaches the DOM as the four
           border longhands; writing them out (and the `border-top` after them)
           keeps jsdom's CSSOM from collapsing the set back to `border: medium`. -->
      <button
        type="button"
        onclick={() => ctx.renderHandlers.stableSelectFileEntry(entry)}
        onmouseenter={(event) => {
          ;(event.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
        }}
        onmouseleave={(event) => {
          ;(event.currentTarget as HTMLElement).style.background =
            idx === ctx.popups.filePicker?.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
        }}
        class={ctx.env.cm.w('full')}
        style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-color: currentcolor; border-image: none; border-style: none; border-width: medium; border-top: {idx >
        0
          ? '1px solid rgba(128,128,128,0.12)'
          : 'none'}; cursor: pointer; color: inherit; text-align: left; font-size: 12px; background: {idx ===
        ctx.popups.filePicker?.selectedIdx
          ? 'rgba(128,128,128,0.1)'
          : 'transparent'}"
      >
        <span style="font-family: monospace; font-weight: 500">{fileName}</span>
        {#if dirPath}
          <span
            class={ctx.env.cm.textMuted}
            style="font-size: 11px; font-family: monospace; opacity: 0.6">{dirPath}</span
          >
        {/if}
        {#if isActive || isOpenTab}
          <span style="margin-left: auto; font-size: 10px; opacity: 0.5; flex-shrink: 0">
            {isActive
              ? ctx.env.t('ide.chat.activeFile', undefined, { defaultValue: 'active' })
              : ctx.env.t('ide.chat.openTab', undefined, { defaultValue: 'open' })}
          </span>
        {/if}
      </button>
    {/each}
  </div>
{/if}

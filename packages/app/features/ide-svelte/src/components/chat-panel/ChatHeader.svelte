<!--
  React's section “── Header: conversation selector” (ChatPanel.tsx): the outer
  panel's header row — the conversation disclosure that opens the history
  dropdown (with its search field and rows), and the share, bug-report,
  settings and new-chat buttons. Rendered by `ChatPanel` when the built-in
  header is on and not hidden.

  The conversation state and the header's actions live in the outer panel's
  context (`ctx`), which the outer unit owns; this file is view only. The
  search field is focused from the outer panel's effect rather than
  `autofocus`, and the dropdown closes on an outside click there too.
-->
<script lang="ts">
  import { relativeTime } from '@molecule/app-ide-panel-logic'

  import { inputValueAttribute } from '../../parts/form-value.js'
  import { styleText } from '../../parts/inline-style.js'
  import Icon from '../Icon.svelte'
  import type { ChatPanelContext } from './context.svelte.js'

  /** The section's shared context (the outer panel's state and actions). */
  let { ctx }: { ctx: ChatPanelContext } = $props()

  /**
   * Sets the conversation title span's opacity — React's hover fade on the
   * disclosure button (1 while hovered, back to 0.7 after).
   *
   * @param button - The disclosure button the pointer entered or left.
   * @param opacity - The opacity to apply to its title span.
   */
  function setTitleOpacity(button: HTMLButtonElement, opacity: string): void {
    const span = button.querySelector('span')
    if (span instanceof HTMLElement) span.style.opacity = opacity
  }

  /**
   * Sets a conversation row's background — React's hover tint (a translucent
   * grey while hovered, cleared after).
   *
   * @param row - The row the pointer entered or left.
   * @param background - The background to apply (empty string clears it).
   */
  function setRowBackground(row: HTMLButtonElement, background: string): void {
    row.style.background = background
  }
</script>

<div
  bind:this={ctx.dropdownRef.current}
  class={ctx.cm.cn(
    ctx.cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
    ctx.cm.sp('px', 2),
    ctx.cm.shrink0,
    ctx.cm.borderB,
  )}
  style={`position: relative;${ctx.isCoarse ? '' : ' height: 33px;'} min-height: 33px; z-index: 10`}
>
  <!-- Conversation picker button -->
  <button
    type="button"
    data-mol-id="chat-conversation-toggle"
    onclick={ctx.toggleDropdown}
    class={ctx.cm.cn(ctx.cm.textSize('xs'), ctx.cm.textMuted)}
    onmouseenter={(event) => setTitleOpacity(event.currentTarget, '1')}
    onmouseleave={(event) => setTitleOpacity(event.currentTarget, '0.7')}
    style="flex: 1; display: flex; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; color: inherit; padding: 6px 6px 6px 0; text-align: left; overflow: hidden; border-radius: 4px"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      style={`display: block; flex-shrink: 0; opacity: 0.5; transform: ${
        ctx.showDropdown ? 'rotate(90deg)' : 'rotate(0deg)'
      }; transition: transform 100ms`}
    >
      <polyline
        points="6,4 10,8 6,12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.7">
      {ctx.activeConv?.preview ??
        ctx.t('ide.chat.historyFallback', undefined, { defaultValue: 'Chat history' })}
    </span>
  </button>

  <!-- Share button — opens the /share link modal. Hidden below the host's
       share capability (admin+ on molecule.dev), viewers included. -->
  {#if ctx.shareAllowed}
    <button
      type="button"
      data-mol-id="chat-share-button"
      onclick={ctx.openShare}
      class={ctx.cm.cn(ctx.cm.button({ variant: 'ghost', size: 'xs' }), ctx.cm.touchTarget)}
      title={ctx.t('ide.chat.share.openShare', undefined, { defaultValue: 'Share project' })}
      aria-label={ctx.t('ide.chat.share.openShare', undefined, { defaultValue: 'Share project' })}
      style="flex-shrink: 0; display: inline-flex; align-items: center"
    >
      <Icon name="share" size={14} aria-hidden="true" />
    </button>
  {/if}

  <!-- Bug-report button — opens the /report modal -->
  <button
    type="button"
    data-mol-id="chat-report-button"
    onclick={ctx.openReport}
    class={ctx.cm.cn(ctx.cm.button({ variant: 'ghost', size: 'xs' }), ctx.cm.touchTarget)}
    title={ctx.t('ide.chat.report.openReport', undefined, { defaultValue: 'Report a bug' })}
    aria-label={ctx.t('ide.chat.report.openReport', undefined, { defaultValue: 'Report a bug' })}
    style="flex-shrink: 0; display: inline-flex; align-items: center"
  >
    <Icon name="bug" size={14} aria-hidden="true" />
  </button>

  <!-- Settings button — opens the /settings view -->
  <button
    type="button"
    data-mol-id="chat-settings-button"
    onclick={ctx.openSettings}
    class={ctx.cm.cn(ctx.cm.button({ variant: 'ghost', size: 'xs' }), ctx.cm.touchTarget)}
    title={ctx.t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' })}
    aria-label={ctx.t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' })}
    style="flex-shrink: 0; display: inline-flex; align-items: center"
  >
    <Icon name="gear" size={14} aria-hidden="true" />
  </button>

  <!-- New chat button — hidden for viewers (creating a conversation is editor work) -->
  {#if ctx.props.canEdit !== false}
    <button
      type="button"
      data-mol-id="chat-new-conversation"
      onclick={ctx.newChat}
      class={ctx.cm.cn(ctx.cm.button({ variant: 'ghost', size: 'xs' }), ctx.cm.touchTarget)}
      title={ctx.t('ide.chat.newChat', undefined, { defaultValue: 'New chat' })}
      style="flex-shrink: 0"
    >
      +
    </button>
  {/if}

  <!-- Dropdown -->
  {#if ctx.showDropdown}
    <div
      class={ctx.cm.cn(ctx.cm.surface, ctx.cm.borderAll)}
      style={`position: absolute; top: 100%; left: 0; right: 0; z-index: 100; max-height: ${
        ctx.isNarrow ? 'min(50dvh, 420px)' : '280px'
      }; overflow-y: auto; scrollbar-width: thin; border-radius: 0 0 6px 6px; box-shadow: 0 6px 20px rgba(0,0,0,0.3)`}
    >
      <!-- Search -->
      <div
        style="padding: 6px 10px; border-bottom: 1px solid rgba(128,128,128,0.12); position: sticky; top: 0"
        class={ctx.cm.surface}
      >
        <input
          bind:this={ctx.convSearchRef.current}
          value={ctx.convSearch}
          use:inputValueAttribute={ctx.convSearch}
          oninput={(event) => ctx.setConvSearch(event.currentTarget.value)}
          placeholder={ctx.t('ide.chat.searchConversations', undefined, {
            defaultValue: 'Search conversations…',
          })}
          class={ctx.cm.textSize('xs')}
          use:styleText={`width: 100%; background: transparent; border: none; outline: none; color: inherit;${
            ctx.isNarrow ? ' font-size: 16px;' : ''
          }`}
        />
      </div>

      <!-- Conversation list -->
      {#if ctx.filteredConvs.length === 0}
        <div class={ctx.cm.cn(ctx.cm.textMuted, ctx.cm.textSize('xs'))} style="padding: 10px 12px">
          {ctx.t('ide.chat.noConversations', undefined, {
            defaultValue: 'No conversations yet',
          })}
        </div>
      {/if}
      {#each ctx.filteredConvs as conv (conv.id)}
        <button
          type="button"
          data-mol-id={`chat-conversation-${conv.id}`}
          onclick={() => ctx.selectConversation(conv.id)}
          class={ctx.cm.cn(
            ctx.cm.w('full'),
            conv.id === ctx.activeConversationId ? ctx.cm.surfaceSecondary : '',
          )}
          onmouseenter={(event) => setRowBackground(event.currentTarget, 'rgba(128,128,128,0.1)')}
          onmouseleave={(event) => setRowBackground(event.currentTarget, '')}
          style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 12px; border: none; cursor: pointer; color: inherit; text-align: left"
        >
          <span
            class={ctx.cm.textSize('xs')}
            style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%"
          >
            {conv.preview ?? 'New conversation'}
          </span>
          <span class={ctx.cm.cn(ctx.cm.textMuted, ctx.cm.textSize('xs'))} style="opacity: 0.55">
            {relativeTime(conv.updatedAt)}
          </span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<!--
  React's section “Input container — matches user message card style”
  (ChatPanel.tsx lines 8282–8798): the composer box — the uncontrolled textarea
  and its hint row (plan/execute toggle, fast-mode toggle, dictation, attach,
  the `@` and `/` affordances, the context ring, and the stop/send pair).

  `data-mol-viewer` marks view-only mode for HOST CSS: molecule-dev's composer
  ring (`index.css :has(> textarea[data-mol-chat-input])`) neutralizes the
  container's own border-color with !important and paints a ::before ring, so
  the gold view-mode border must be applied to the RING via this attribute —
  the inline border below only serves ring-less hosts.

  View only: the state and the handlers come from the slices through `ctx`.
-->
<script module lang="ts">
  import { getLogger } from '@molecule/app-logger'

  /** The package logger (the same channel the rest of the panel logs on). */
  const logger = getLogger('chat-panel')
</script>

<script lang="ts">
  import { NOTICE_TONE } from '@molecule/app-ide-panel-logic'

  import ContextUsageIndicator from '../../parts/ContextUsageIndicator.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  /** Whether the current agent mode is plan. */
  const isPlan = $derived(ctx.chat.mode === 'plan')

  /** The `@` reference-a-file and `/` slash-command affordances (a viewer keeps only `/`). */
  const composerButtons = $derived(
    [
      {
        sym: '@',
        nudgeY: 0,
        size: 15,
        title: ctx.env.t('ide.chat.mention', undefined, { defaultValue: 'Reference a file' }),
        onClick: ctx.renderHandlers.insertMentionAtCaret,
      },
      {
        sym: 'slash',
        nudgeY: 1,
        size: 15,
        title: ctx.env.t('ide.chat.slashCommands', undefined, {
          defaultValue: 'Slash commands',
        }),
        onClick: ctx.renderHandlers.toggleSlashMenu,
      },
    ].filter(({ sym }) => ctx.props.canEdit !== false || sym !== '@'),
  )

  /**
   * Moves focus into the textarea when the container body (not one of its
   * buttons) is clicked.
   *
   * @param event - The container's click event.
   */
  function handleContainerClick(event: MouseEvent): void {
    const target = event.target as HTMLElement
    if (!target.closest('button')) ctx.composer.textareaRef.current?.focus()
  }

  /** Switches the agent mode and persists it; reverts and says so on failure. */
  function toggleMode(): void {
    const previousMode = ctx.chat.mode
    const newMode = previousMode === 'plan' ? 'execute' : 'plan'
    ctx.chat.setMode(newMode)
    ctx.env.http
      .patch(`/projects/${ctx.props.projectId}/chat-mode`, {
        mode: newMode,
        conversationId: ctx.env.conversationId,
      })
      .catch((error) => {
        logger.warn('chat-panel: persisting chat-mode toggle failed; reverted', { error })
        ctx.chat.setMode(previousMode)
      })
    ctx.systemCards.addSystemCard(
      newMode === 'plan'
        ? ctx.env.t('ide.chat.switchedToPlan', undefined, {
            defaultValue: 'Switched to plan mode',
          })
        : ctx.env.t('ide.chat.switchedToExecute', undefined, {
            defaultValue: 'Switched to execute mode',
          }),
    )
  }

  /**
   * Toggles the provider's fast tier and persists it; reverts and says so on
   * failure.
   */
  function toggleFastMode(): void {
    const previousFastMode = ctx.chat.fastMode
    const next = !previousFastMode
    ctx.chat.setFastMode(next)
    ctx.env.http
      .patch(`/projects/${ctx.props.projectId}/chat-mode`, {
        fastMode: next,
        conversationId: ctx.env.conversationId,
      })
      .catch((error) => {
        logger.warn('chat-panel: persisting fast-mode toggle failed; reverted', { error })
        ctx.chat.setFastMode(previousFastMode)
      })
    ctx.systemCards.addSystemCard(
      next
        ? ctx.env.t('ide.chat.fastModeOn', undefined, {
            defaultValue: 'Fast mode on — faster responses at a higher rate',
          })
        : ctx.env.t('ide.chat.fastModeOff', undefined, { defaultValue: 'Fast mode off' }),
    )
  }
</script>

<div
  class={ctx.env.cm.surfaceSecondary}
  hidden={ctx.env.transcriptOnly}
  data-mol-id="chat-composer"
  role="presentation"
  data-mol-viewer={ctx.props.canEdit === false ? '' : undefined}
  style={`border-radius: ${
    ctx.props.discovery ? '8px' : '8px 8px 0 0'
  }; padding: 8px 10px; cursor: text;${
    ctx.timeline.workVisible ? ' position: relative; z-index: 1;' : ''
  }${ctx.props.canEdit === false ? ` border: 1px solid ${NOTICE_TONE.gold.accent};` : ''}`}
  onclick={handleContainerClick}
>
  <textarea
    bind:this={ctx.composer.textareaRef.current}
    data-mol-chat-input=""
    aria-label={ctx.env.t('ide.chat.inputLabel', undefined, { defaultValue: 'Write a message' })}
    value={ctx.composer.initialDraft}
    autocomplete="off"
    oninput={ctx.input.handleInputChange}
    onpaste={ctx.attachments.handlePaste}
    placeholder={ctx.props.canEdit === false
      ? ctx.env.t('ide.chat.placeholderViewer', undefined, { defaultValue: 'Message your team' })
      : ctx.env.t('ide.chat.placeholder', undefined, { defaultValue: 'Send a message...' })}
    rows={1}
    class={ctx.env.cm.textSize('sm')}
    style={`width: 100%; display: block; padding: 0; color: inherit; resize: none; outline: none; border: none; font-family: inherit; overflow-y: auto; scrollbar-width: thin; box-sizing: border-box;${
      ctx.env.isNarrow || ctx.env.isCoarse ? ' font-size: 16px;' : ''
    }`}
    style:background="transparent"></textarea>
  <!-- Hint row: shortcuts · context ring · send -->
  <div style="display: flex; align-items: center; margin-top: 6px; gap: 4px">
    <!-- Plan/Execute mode toggle — hidden for viewers: the mode drives Synthase,
         which a viewer can't run. Icon buttons all use identical box model for
         vertical alignment: fixed flex-centered boxes (24×24 fine pointer,
         40×32 coarse — wide for touch hit spacing but deliberately flat so the
         composer row doesn't balloon vertically). Glyph sizes never change. -->
    {#if ctx.props.canEdit !== false}
      <button
        type="button"
        onclick={toggleMode}
        title={isPlan
          ? ctx.env.t('ide.chat.switchToExecute', undefined, {
              defaultValue: 'Switch to execute mode',
            })
          : ctx.env.t('ide.chat.switchToPlan', undefined, { defaultValue: 'Switch to plan mode' })}
        style={`display: inline-flex; align-items: center; justify-content: center; width: ${
          ctx.env.isCoarse ? 40 : 24
        }px; height: ${ctx.env.isCoarse ? 32 : 24}px; border: ${
          isPlan
            ? `1px solid ${ctx.env.isLight ? 'rgba(217,119,6,0.55)' : 'rgba(234,179,8,0.5)'}`
            : 'none'
        }; border-radius: 3px; cursor: ${ctx.props.canEdit ? 'pointer' : 'not-allowed'}; color: ${
          isPlan ? (ctx.env.isLight ? '#d97706' : '#eab308') : 'inherit'
        }; opacity: ${!ctx.props.canEdit ? 0.4 : isPlan ? 1 : 0.4}; padding: 0; transition: opacity 100ms, color 100ms`}
        style:background={isPlan
          ? ctx.env.isLight
            ? 'rgba(217,119,6,0.14)'
            : 'rgba(234,179,8,0.13)'
          : 'none'}
        onmouseenter={(event) => {
          if (!isPlan) event.currentTarget.style.opacity = '0.85'
        }}
        onmouseleave={(event) => {
          if (!isPlan) event.currentTarget.style.opacity = '0.4'
        }}
      >
        <!-- Lightbulb icon (Primer Octicons) for plan mode -->
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"
          />
        </svg>
      </button>
    {/if}
    <!-- Fast mode (⚡) toggle — rendered only when the current mode's model
         supports the provider's fast/priority speed tier. Persisted
         per-CONVERSATION (aiContext.fastMode): switching speed invalidates the
         provider prompt cache, so it's a conversation-level choice. -->
    {#if ctx.pickers.fastModeAvailable && ctx.props.canEdit !== false}
      <button
        type="button"
        data-mol-id="chat-fast-mode-toggle"
        disabled={!ctx.props.canEdit}
        onclick={toggleFastMode}
        title={ctx.chat.fastMode
          ? ctx.env.t('ide.chat.fastModeDisable', undefined, {
              defaultValue: 'Turn off fast mode',
            })
          : ctx.env.t('ide.chat.fastModeEnable', undefined, {
              defaultValue: 'Fast mode — up to 2.5× faster output at a higher token rate',
            })}
        style={`display: inline-flex; align-items: center; justify-content: center; width: ${
          ctx.env.isCoarse ? 40 : 24
        }px; height: ${ctx.env.isCoarse ? 32 : 24}px; border: ${
          ctx.chat.fastMode
            ? `1px solid ${ctx.env.isLight ? 'rgba(217,119,6,0.55)' : 'rgba(234,179,8,0.5)'}`
            : 'none'
        }; border-radius: 3px; cursor: pointer; color: ${
          ctx.chat.fastMode ? (ctx.env.isLight ? '#d97706' : '#eab308') : 'inherit'
        }; opacity: ${ctx.chat.fastMode ? 1 : 0.4}; padding: 0; transition: opacity 100ms, color 100ms`}
        style:background={ctx.chat.fastMode
          ? ctx.env.isLight
            ? 'rgba(217,119,6,0.14)'
            : 'rgba(234,179,8,0.13)'
          : 'none'}
        onmouseenter={(event) => {
          if (!ctx.chat.fastMode) event.currentTarget.style.opacity = '0.85'
        }}
        onmouseleave={(event) => {
          if (!ctx.chat.fastMode) event.currentTarget.style.opacity = '0.4'
        }}
      >
        <!-- Zap icon (Primer Octicons) for fast mode -->
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M9.504.43a.75.75 0 0 1 .584.859l-.828 4.211h4.49a.75.75 0 0 1 .573 1.234l-7.25 8.5a.75.75 0 0 1-1.32-.658l.828-4.211H2.09a.75.75 0 0 1-.573-1.234l7.25-8.5a.75.75 0 0 1 .737-.201Z"
          />
        </svg>
      </button>
    {/if}
    <!-- Voice input button — ALWAYS rendered. When dictation can't work here,
         clicking shows the reason (voiceError) or opens the /mic picker with
         unusable engines disabled — it never just vanishes. -->
    <button
      type="button"
      data-mol-id="chat-mic-button"
      onclick={ctx.voice.toggleVoice}
      title={ctx.voice.isListening
        ? ctx.env.t('ide.chat.voiceStop', undefined, { defaultValue: 'Stop dictation' })
        : ctx.env.t('ide.chat.voice', undefined, { defaultValue: 'Dictate' })}
      style={`display: inline-flex; align-items: center; justify-content: center; width: ${
        ctx.env.isCoarse ? 40 : 24
      }px; height: ${ctx.env.isCoarse ? 32 : 24}px; border: none; cursor: pointer; color: ${
        ctx.voice.isListening ? 'rgb(239,68,68)' : 'inherit'
      }; opacity: ${ctx.voice.isListening ? 1 : 0.4}; padding: 0; border-radius: 3px; transition: opacity 100ms, color 100ms`}
      style:background="none"
      onmouseenter={(event) => {
        if (!ctx.voice.isListening) event.currentTarget.style.opacity = '0.85'
      }}
      onmouseleave={(event) => {
        if (!ctx.voice.isListening) event.currentTarget.style.opacity = '0.4'
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        style="display: block"
      >
        <rect
          x="6"
          y="1"
          width="4"
          height="8"
          rx="2"
          fill={ctx.voice.isListening ? 'currentColor' : 'none'}
          stroke="currentColor"
          stroke-width="1.25"
        />
        <path
          d="M4 7v1a4 4 0 008 0V7"
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
        />
        <line
          x1="8"
          y1="12"
          x2="8"
          y2="15"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
        />
        <line
          x1="6"
          y1="15"
          x2="10"
          y2="15"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
        />
      </svg>
    </button>
    <!-- Attachment button — hidden for viewers: attachments feed Synthase turns. -->
    {#if ctx.props.canEdit !== false}
      <button
        type="button"
        onclick={() => ctx.attachments.fileInputRef.current?.click()}
        title={ctx.env.t('ide.chat.attachFile', undefined, { defaultValue: 'Attach file' })}
        style={`display: inline-flex; align-items: center; justify-content: center; width: ${
          ctx.env.isCoarse ? 40 : 24
        }px; height: ${ctx.env.isCoarse ? 32 : 24}px; border: none; cursor: pointer; color: inherit; opacity: 0.4; padding: 0; border-radius: 3px; transition: opacity 100ms`}
        style:background="none"
        onmouseenter={(event) => {
          event.currentTarget.style.opacity = '0.85'
        }}
        onmouseleave={(event) => {
          event.currentTarget.style.opacity = '0.4'
        }}
      >
        <!-- Paperclip icon (Primer Octicons) -->
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" style="display: block">
          <path
            d="M12.212 3.02a1.753 1.753 0 0 0-2.478.003l-5.83 5.83a3.007 3.007 0 0 0-.88 2.127c0 .795.315 1.551.88 2.116.567.567 1.333.89 2.126.89.79 0 1.548-.321 2.116-.89l5.48-5.48a.75.75 0 0 1 1.061 1.06l-5.48 5.48a4.492 4.492 0 0 1-3.177 1.33c-1.2 0-2.345-.487-3.187-1.33a4.483 4.483 0 0 1-1.32-3.177c0-1.195.475-2.341 1.32-3.186l5.83-5.83a3.25 3.25 0 0 1 5.553 2.297c0 .863-.343 1.691-.953 2.301L7.439 12.39c-.375.377-.884.59-1.416.593a1.998 1.998 0 0 1-1.412-.593 1.992 1.992 0 0 1 0-2.828l5.48-5.48a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-5.48 5.48a.492.492 0 0 0 0 .707.499.499 0 0 0 .352.154.51.51 0 0 0 .356-.154l5.833-5.827a1.755 1.755 0 0 0 0-2.481Z"
          />
        </svg>
      </button>
    {/if}
    {#each composerButtons as { sym, nudgeY, size: fontSize, title, onClick } (sym)}
      <button
        type="button"
        onclick={onClick}
        {title}
        style={`display: inline-flex; align-items: center; justify-content: center; width: ${
          ctx.env.isCoarse ? 40 : 24
        }px; height: ${ctx.env.isCoarse ? 32 : 24}px; border: none; cursor: pointer; color: inherit; opacity: 0.4; padding: 0; border-radius: 3px; font-family: inherit; font-size: ${fontSize}px; line-height: 1; transition: opacity 100ms`}
        style:background="none"
        onmouseenter={(event) => {
          event.currentTarget.style.opacity = '0.85'
        }}
        onmouseleave={(event) => {
          event.currentTarget.style.opacity = '0.4'
        }}
      >
        {#if sym === 'slash'}
          <svg
            width="9"
            height="13"
            viewBox="0 0 9 13"
            style={`display: block; position: relative; top: ${nudgeY}px`}
          >
            <line
              x1="8"
              y1="1"
              x2="1"
              y2="12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        {:else}
          <span style={`position: relative; top: ${nudgeY}px`}>{sym}</span>
        {/if}
      </button>
    {/each}
    {#if ctx.props.canEdit !== false && ctx.contextUsage.contextUsage}
      <ContextUsageIndicator
        usage={ctx.contextUsage.contextUsage}
        history={ctx.contextUsage.contextHistory}
        compactions={ctx.contextUsage.contextCompactions}
        projectId={ctx.props.projectId}
        conversationId={ctx.env.conversationId}
        onOpenSettings={() => ctx.overlay.openPanelOverlay('settings')}
      />
    {/if}
    <div
      style={`margin-left: ${
        ctx.props.canEdit !== false && ctx.contextUsage.contextUsage ? '4px' : 'auto'
      }; display: flex; gap: 4px; align-items: center`}
    >
      <!-- Shown whenever ANY backend turn streams for this conversation — a
           local send (isLoading) OR a remote one this client doesn't own — so
           a running turn can ALWAYS be stopped. -->
      {#if ctx.props.canEdit !== false && (ctx.chat.isLoading || ctx.chat.isRemoteStreaming)}
        <button
          type="button"
          data-mol-id="chat-stop-button"
          onclick={ctx.chat.handleAbort}
          title={ctx.env.t('ide.chat.stop', undefined, { defaultValue: 'Stop' })}
          aria-label={ctx.env.t('ide.chat.stop', undefined, { defaultValue: 'Stop' })}
          class={ctx.env.cm.button({ variant: 'solid', color: 'error', size: 'xs' })}
          style={ctx.env.isCoarse ? 'min-width: 40px; min-height: 32px' : undefined}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" style="display: block">
            <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
          </svg>
        </button>
      {/if}
      <button
        type="button"
        data-mol-id="chat-send-button"
        onclick={() => void ctx.submit.handleSubmit()}
        title={ctx.env.t('ide.chat.send', undefined, { defaultValue: 'Send' })}
        aria-label={ctx.env.t('ide.chat.send', undefined, { defaultValue: 'Send' })}
        disabled={!ctx.composer.hasInput && ctx.popups.attachedFiles.length === 0}
        class={ctx.env.cm.button({ variant: 'solid', color: 'primary', size: 'xs' })}
        style={ctx.env.isCoarse ? 'min-width: 40px; min-height: 32px' : undefined}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" style="display: block">
          <path
            d="M 2.5,6.5 L 6,3 L 9.5,6.5 M 6,3.5 L 6,10"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</div>

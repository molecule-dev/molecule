<!--
  React's section “Queued messages — anchored above the composer” (ChatPanel.tsx
  lines 7755–8018): the compact bar that holds messages typed while the agent is
  working.

  Each queued message is one single-line row (truncated text plus inline
  edit/delete/send). The bar caps its height so many queued messages scroll in
  place instead of growing the footer, and it is hidden while a popup menu is
  open, matching the commit bar above it. A row's pencil opens the inline editor
  (its textarea, focus and state live in the `chat:queued-edit` slice).

  View only: the state and the handlers come from the slices through `ctx`.
-->
<script lang="ts">
  import { defaultValueSeed } from '../../parts/form-value.js'
  import Icon from '../Icon.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  /** The queued messages waiting for delivery (React's `queuedMessages`). */
  const queuedMessages = $derived(ctx.timeline.queuedMessages)

  /** Whether a popup menu owns the surface above the composer (React's hide guard). */
  const popupOpen = $derived(
    !!ctx.composer.commandMenu ||
      !!ctx.composer.modelPicker ||
      !!ctx.composer.effortPicker ||
      !!ctx.overlay.panelOverlay,
  )

  /**
   * Opens the inline editor on a queued row, seeding it with the row's text
   * (React's click handler, in the same order).
   *
   * @param id - The queued message's id.
   * @param content - The queued message's text.
   */
  function startEditing(id: string, content: string): void {
    ctx.queuedEdit.setEditingQueuedId(id)
    ctx.queuedEdit.setEditingQueuedText(content)
  }

  /**
   * Applies the editor: saves the trimmed text, or deletes the row when the
   * text is empty, then closes the editor (React's save path, shared by the
   * Save button and Enter).
   *
   * @param id - The queued message's id.
   */
  function commitEdit(id: string): void {
    const trimmed = ctx.queuedEdit.editingQueuedText.trim()
    if (trimmed) ctx.chat.editQueuedMessage(id, trimmed)
    else ctx.chat.deleteQueuedMessage(id)
    ctx.queuedEdit.setEditingQueuedId(null)
  }

  /**
   * Reads the editor's live text into the slice (React's `onChange`).
   *
   * @param event - The textarea's input event.
   */
  function handleEditInput(event: Event): void {
    ctx.queuedEdit.setEditingQueuedText((event.currentTarget as HTMLTextAreaElement).value)
  }

  /**
   * The editor's keys: Enter (without Shift) saves, Escape closes (React's
   * `onKeyDown`).
   *
   * @param event - The textarea's keydown event.
   * @param id - The queued message's id.
   */
  function handleEditKeyDown(event: KeyboardEvent, id: string): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      commitEdit(id)
    }
    if (event.key === 'Escape') ctx.queuedEdit.setEditingQueuedId(null)
  }

  /**
   * Sends a queued row at once, dropping it from the queue first (React's
   * send-now path).
   *
   * @param id - The queued message's id.
   * @param content - The queued message's text.
   */
  function sendQueuedNow(id: string, content: string): void {
    ctx.chat.deleteQueuedMessage(id)
    ctx.chat.sendMessage(content)
  }
</script>

{#if queuedMessages.length > 0 && !popupOpen}
  <div style="border-top: 1px solid rgba(128,128,128,0.15); padding: 6px 8px 6px 10px">
    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px">
      <Icon name="clock" size={11} aria-hidden="true" style="opacity: 0.5; flex-shrink: 0" />
      <span
        class={ctx.env.cm.cn(ctx.env.cm.textMuted, ctx.env.cm.textSize('xs'))}
        style="font-style: italic"
      >
        {ctx.env.t(
          'ide.chat.queuedCount',
          { count: queuedMessages.length },
          { defaultValue: '{{count}} queued' },
        )}
      </span>
    </div>
    <!-- Cap the height so many queued messages scroll in place rather than
         pushing the composer down; single-line rows keep it tight. -->
    <div
      style="max-height: 132px; overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column; gap: 2px"
    >
      {#each queuedMessages as qm (qm.id)}
        {#if ctx.queuedEdit.editingQueuedId === qm.id}
          <div style="display: flex; flex-direction: column; gap: 6px">
            <textarea
              bind:this={ctx.queuedEdit.queuedEditRef.current}
              aria-label={ctx.env.t('ide.chat.queuedEdit.label', undefined, {
                defaultValue: 'Edit queued message',
              })}
              use:defaultValueSeed={ctx.queuedEdit.editingQueuedText}
              oninput={handleEditInput}
              onkeydown={(event) => handleEditKeyDown(event, qm.id)}
              class={ctx.env.cm.cn(ctx.env.cm.surface, ctx.env.cm.textSize('sm'))}
              style={`width: 100%; min-height: 52px; padding: 6px 8px; border: 1px solid ${
                ctx.env.isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'
              }; border-radius: 6px; resize: vertical; color: inherit; font-family: inherit`}
            ></textarea>
            <div style="display: flex; gap: 6px; justify-content: flex-end">
              <!-- A Cancel/Save pair side by side: the dismissive one is
                   SECONDARY, the confirming one PRIMARY — the same pairing the
                   rest of the app uses. -->
              <button
                type="button"
                data-mol-id="chat-queued-edit-cancel"
                onclick={() => ctx.queuedEdit.setEditingQueuedId(null)}
                class={ctx.env.cm.cn(
                  ctx.env.cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
                  ctx.env.cm.touchTargetCompact,
                )}
              >
                {ctx.env.t('common.cancel', undefined, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                data-mol-id="chat-queued-edit-save"
                onclick={() => commitEdit(qm.id)}
                class={ctx.env.cm.cn(
                  ctx.env.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                  ctx.env.cm.touchTargetCompact,
                )}
              >
                {ctx.env.t('common.save', undefined, { defaultValue: 'Save' })}
              </button>
            </div>
          </div>
        {:else}
          <div style="display: flex; align-items: center; gap: 6px; min-width: 0">
            <span
              title={qm.content}
              class={ctx.env.cm.textSize('sm')}
              style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.8"
            >
              {qm.content}
            </span>
            <button
              /* mol-bespoke-button: icon-only edit affordance — 22px (32px coarse) pencil on a dense queued-message row */
              type="button"
              title={ctx.env.t('ide.chat.editQueued', undefined, { defaultValue: 'Edit' })}
              onclick={() => startEditing(qm.id, qm.content)}
              style={`display: inline-flex; align-items: center; justify-content: center; width: ${
                ctx.env.isCoarse ? 32 : 22
              }px; height: ${
                ctx.env.isCoarse ? 32 : 22
              }px; flex-shrink: 0; border: none; border-radius: 4px; color: inherit; opacity: 0.5; cursor: pointer; padding: 0; transition: opacity 100ms, background 100ms; background: none`}
              onmouseenter={(event) => {
                event.currentTarget.style.opacity = '1'
                event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
              }}
              onmouseleave={(event) => {
                event.currentTarget.style.opacity = '0.5'
                event.currentTarget.style.background = 'none'
              }}
            >
              <Icon name="pencil" size={13} aria-hidden="true" />
            </button>
            <button
              /* mol-bespoke-button: icon-only delete affordance — 22px (32px coarse) trash on a dense queued-message row, theme error token */
              type="button"
              title={ctx.env.t('ide.chat.deleteQueued', undefined, { defaultValue: 'Delete' })}
              onclick={() => ctx.chat.deleteQueuedMessage(qm.id)}
              style={`display: inline-flex; align-items: center; justify-content: center; width: ${
                ctx.env.isCoarse ? 32 : 22
              }px; height: ${
                ctx.env.isCoarse ? 32 : 22
              }px; flex-shrink: 0; border: none; border-radius: 4px; color: var(--mol-color-error, #dc2626); opacity: 0.6; cursor: pointer; padding: 0; transition: opacity 100ms, background 100ms; background: none`}
              onmouseenter={(event) => {
                event.currentTarget.style.opacity = '1'
                event.currentTarget.style.background =
                  'color-mix(in srgb, var(--mol-color-error, #dc2626) 12%, transparent)'
              }}
              onmouseleave={(event) => {
                event.currentTarget.style.opacity = '0.6'
                event.currentTarget.style.background = 'none'
              }}
            >
              <Icon name="trash" size={13} aria-hidden="true" />
            </button>
            {#if !ctx.chat.isLoading}
              <button
                /* mol-bespoke-button: icon-only send affordance — 22px (32px coarse) arrow on a dense queued-message row, theme success token */
                type="button"
                title={ctx.env.t('ide.chat.sendQueued', undefined, { defaultValue: 'Send' })}
                onclick={() => sendQueuedNow(qm.id, qm.content)}
                style={`display: inline-flex; align-items: center; justify-content: center; width: ${
                  ctx.env.isCoarse ? 32 : 22
                }px; height: ${
                  ctx.env.isCoarse ? 32 : 22
                }px; flex-shrink: 0; border: none; border-radius: 4px; color: var(--mol-color-success, #16a34a); opacity: 0.7; cursor: pointer; padding: 0; transition: opacity 100ms, background 100ms; background: none`}
                onmouseenter={(event) => {
                  event.currentTarget.style.opacity = '1'
                  event.currentTarget.style.background =
                    'color-mix(in srgb, var(--mol-color-success, #16a34a) 14%, transparent)'
                }}
                onmouseleave={(event) => {
                  event.currentTarget.style.opacity = '0.7'
                  event.currentTarget.style.background = 'none'
                }}
              >
                <!-- Same up-arrow glyph as the composer's Send button. -->
                <svg width="13" height="13" viewBox="0 0 12 12" style="display: block">
                  <path
                    d="M 2.5,6.5 L 6,3 L 9.5,6.5 M 6,3.5 L 6,10"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>
                </svg>
              </button>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  </div>
{/if}

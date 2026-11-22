<!--
  React's section “── 5XX backoff-retry countdown banner ──” (ChatPanel.tsx
  lines 5735–5784): the mirror of the auto-fix strip for a server-error retry.
  The session surfaces `retryCountdown` only while a 5XX auto-retry is pending
  (the error itself is held back until the retries are exhausted or the user
  cancels), so this banner and the error message are never shown at once.

  View only — no effect: the pending retry and its cancel action live in the
  `chat:chat` slice.
-->
<script lang="ts">
  import Icon from '../Icon.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context (the pending retry and its cancel action). */
  let { ctx }: { ctx: ChatContext } = $props()

  const cm = $derived(ctx.env.cm)
  const t = $derived(ctx.env.t)
  /** The pending backoff-retry countdown, or null while no retry is pending. */
  const retryCountdown = $derived(ctx.chat.retryCountdown)
</script>

{#if retryCountdown}
  <div
    class={cm.cn(cm.shrink0, cm.borderT)}
    data-mol-id="chat-retry-countdown"
    style="align-items: center; background: rgba(234, 179, 8, 0.06); display: flex; font-size: 12px; gap: 8px; padding: 6px 12px"
  >
    <Icon
      name="exclamation-triangle"
      size={14}
      aria-hidden="true"
      style="color: rgb(212, 160, 23); flex-shrink: 0"
    />
    <span style="flex: 1 1 0%; opacity: 0.85">
      {t(
        'ide.chat.retryCountdown',
        { seconds: retryCountdown.secondsRemaining, attempt: retryCountdown.attempt },
        { defaultValue: 'Server error — retrying in {{seconds}}s… (attempt {{attempt}})' },
      )}
    </span>
    <button
      type="button"
      data-mol-id="chat-retry-cancel"
      onclick={() => ctx.chat.cancelRetry()}
      class={cm.cn(
        cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
        cm.touchTargetCompact,
      )}
    >
      {t('ide.chat.autoFixCancel', undefined, { defaultValue: 'Cancel' })}
    </button>
  </div>
{/if}

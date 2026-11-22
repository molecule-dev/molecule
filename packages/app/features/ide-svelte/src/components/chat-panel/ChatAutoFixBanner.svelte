<!--
  React's section “── Auto-fix countdown banner ──” (ChatPanel.tsx lines
  5661–5734): the strip a failed verification arms above the composer, shown
  while the countdown runs. It mirrors the retry strip below it: a warning icon,
  the countdown (or the paused label), the Resume-or-Pause control and Cancel.
  Both strips share one button treatment, as React renders them.

  View only — no effect: the countdown and its dispatcher live in the
  `chat:auto-fix` slice.
-->
<script lang="ts">
  import Icon from '../Icon.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context (the countdown state and its dispatcher). */
  let { ctx }: { ctx: ChatContext } = $props()

  const cm = $derived(ctx.env.cm)
  const t = $derived(ctx.env.t)
  /** The armed countdown, or null while no auto-fix is pending. */
  const countdown = $derived(ctx.autoFix.autoFixCountdown)
</script>

{#if countdown}
  <div
    class={cm.cn(cm.shrink0, cm.borderT)}
    style="align-items: center; background: rgba(234, 179, 8, 0.06); display: flex; font-size: 12px; gap: 8px; padding: 6px 12px"
  >
    <Icon
      name="exclamation-triangle"
      size={14}
      aria-hidden="true"
      style="color: rgb(212, 160, 23); flex-shrink: 0"
    />
    <span style="flex: 1 1 0%; opacity: 0.85">
      {#if countdown.paused}
        {t('ide.chat.autoFixPaused', undefined, { defaultValue: 'Auto-fix paused' })}
      {:else}
        {t(
          'ide.chat.autoFixCountdown',
          { seconds: countdown.secondsLeft },
          { defaultValue: 'Auto-fixing in {{seconds}}s...' },
        )}
      {/if}
    </span>
    {#if countdown.paused}
      <button
        type="button"
        data-mol-id="chat-autofix-resume"
        onclick={() => ctx.autoFix.dispatchAutoFix({ type: 'resume' })}
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
          cm.touchTargetCompact,
        )}
      >
        {t('ide.chat.autoFixResume', undefined, { defaultValue: 'Resume' })}
      </button>
    {:else}
      <button
        type="button"
        data-mol-id="chat-autofix-pause"
        onclick={() => ctx.autoFix.dispatchAutoFix({ type: 'pause' })}
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'warning', size: 'xs' }),
          cm.touchTargetCompact,
        )}
      >
        {t('ide.chat.autoFixPause', undefined, { defaultValue: 'Pause' })}
      </button>
    {/if}
    <button
      type="button"
      data-mol-id="chat-autofix-cancel"
      onclick={() => ctx.autoFix.dispatchAutoFix({ type: 'cancel' })}
      class={cm.cn(
        cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
        cm.touchTargetCompact,
      )}
    >
      {t('ide.chat.autoFixCancel', undefined, { defaultValue: 'Cancel' })}
    </button>
  </div>
{/if}

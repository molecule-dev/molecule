<!--
  ConfirmButton: two-step destructive-action button. The first click arms it
  ("Confirm?"), the second commits; it auto-disarms after disarmSeconds
  (default 4s), Escape disarms, and while onConfirm is pending the button
  ignores further clicks. The armed state is announced through aria-live.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { ConfirmButtonProps } from '../types.js'
  import ReactNode from './ReactNode.svelte'

  let {
    onConfirm,
    label,
    confirmLabel,
    pendingLabel,
    disarmSeconds = 4,
    disabled,
    testId,
    className,
    color,
    size,
    variant,
    style,
    ...rest
  }: ConfirmButtonProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  let phase = $state<'idle' | 'armed' | 'pending'>('idle')
  let disarmTimer: ReturnType<typeof setTimeout> | null = null

  const disarm = (): void => {
    if (disarmTimer) clearTimeout(disarmTimer)
    disarmTimer = null
    phase = 'idle'
  }

  $effect(() => {
    return () => {
      if (disarmTimer) clearTimeout(disarmTimer)
    }
  })

  $effect(() => {
    if (phase !== 'armed' || disarmSeconds <= 0) return
    disarmTimer = setTimeout(disarm, disarmSeconds * 1000)
    return () => {
      if (disarmTimer) clearTimeout(disarmTimer)
    }
  })

  $effect(() => {
    if (phase !== 'armed') return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') disarm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const handleClick = (): void => {
    if (phase === 'idle') {
      phase = 'armed'
      return
    }
    if (phase === 'pending') return
    phase = 'pending'
    void (async () => {
      try {
        await onConfirm()
      } catch (_error) {
        // A rejected confirm means the action failed: the caller owns that
        // error and shows its own message, and the button returns to idle so
        // the user can retry.
      } finally {
        phase = 'idle'
      }
    })()
  }
</script>

<button
  type="button"
  onclick={handleClick}
  disabled={disabled || phase === 'pending'}
  aria-live="polite"
  data-state={phase}
  data-testid={testId}
  class={cm.cn(
    cm.button({ color: phase === 'armed' ? 'error' : (color ?? 'primary'), size, variant }),
    className,
  )}
  use:reactStyle={style}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {#if phase === 'pending'}
    {#if pendingLabel}<ReactNode node={pendingLabel} />{:else}{t(
        'confirmButton.pending',
        {},
        { defaultValue: 'Working…' },
      )}{/if}
  {:else if phase === 'armed'}
    {#if confirmLabel}<ReactNode node={confirmLabel} />{:else}{t(
        'confirmButton.confirm',
        {},
        { defaultValue: 'Confirm?' },
      )}{/if}
  {:else}
    <ReactNode node={label} />
  {/if}
</button>

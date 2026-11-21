<!--
  OnboardingModal: the Svelte counterpart of
  `@molecule/app-onboarding-modal-react`'s `OnboardingModal` — a multi-step
  overlay with the current step's media, title and body, jump-to-step dots and
  the Skip / Back / Next / Get-started controls. Same props and same DOM for
  the same input; step position is uncontrolled and persists across
  close/reopen, exactly as React's `useState` does.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Modal } from '@molecule/app-ui-svelte'

  import type { ReactNodeProp } from './node-prop.js'
  import type { OnboardingModalProps } from './types.js'

  let {
    open,
    onClose,
    steps,
    onComplete,
    allowSkip = true,
    defaultStep = 0,
  }: OnboardingModalProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Names the dialog after the current step's title (React's `useId()`): the
  // h2's id, handed to `Modal` as `aria-labelledby` — a `role="dialog"` without
  // an accessible name is an axe `aria-dialog-name` violation, and the name
  // must follow the step.
  const titleId = $props.id()

  // React's `useState(defaultStep)`: read once, then owned by the component.
  let step = $state(untrack(() => defaultStep))

  const total = $derived(steps.length)
  /** The step the content shows, clamped into the list (React's `Math.max`/`Math.min`). */
  const current = $derived(steps[Math.max(0, Math.min(step, total - 1))])
  const isLast = $derived(step >= total - 1)

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the text re-runs on a locale switch the way React's render-time
  // `t` call re-runs on a re-render.
  const label = $derived(
    isLast
      ? t('onboarding.done', {}, { defaultValue: 'Get started' })
      : t('onboarding.next', {}, { defaultValue: 'Next' }),
  )
  const backLabel = $derived(t('onboarding.back', {}, { defaultValue: 'Back' }))
  const skipLabel = $derived(t('onboarding.skip', {}, { defaultValue: 'Skip' }))

  /** Advance to the next step, or complete and close if on the last step. */
  function next(): void {
    if (isLast) {
      onComplete?.()
      onClose?.()
    } else step += 1
  }

  /** Step back one position (never below the starting index). */
  function back(): void {
    step -= 1
  }

  /**
   * Close without completing (React's Skip / chrome close). React passes the
   * triggering click event through to `onClose` for those two buttons and none
   * for Escape, so any received event is forwarded.
   *
   * @param event - The click event that asked to close, when there was one.
   */
  function close(event?: unknown): void {
    if (event === undefined || event === null) onClose?.()
    else onClose?.(event)
  }
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value()}{:else}{value ?? ''}{/if}
{/snippet}

<!-- React returns null before its `<Modal>` renders when there are no steps.
     The Modal component itself stays mounted (its body portal is torn down by
     `open` going false, not by this component unmounting) and is closed. -->
<Modal
  open={open && total > 0}
  onClose={(event?: unknown) => close(event)}
  aria-labelledby={titleId}
>
  {#if total > 0}
    <div class={cm.stack(4)}>
      {#if current.media}
        <div class={cm.flex({ align: 'center', justify: 'center' })}>
          {@render node(current.media)}
        </div>
      {/if}
      <h2 id={titleId} class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
        {@render node(current.title)}
      </h2>
      <div class={cm.textSize('sm')}>{@render node(current.body)}</div>
      <footer class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <div class={cm.flex({ align: 'center', gap: 'xs' })}>
          {#each steps as s, i (s.id)}
            <span
              aria-hidden="true"
              style:width="6px"
              style:height="6px"
              style:border-radius="50%"
              style:background={i === step ? 'currentColor' : 'rgba(0,0,0,0.2)'}
            ></span>
          {/each}
        </div>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          {#if allowSkip && !isLast}
            <Button variant="ghost" size="sm" onClick={close}>{skipLabel}</Button>
          {/if}
          {#if step > 0}
            <Button variant="ghost" size="sm" onClick={back}>{backLabel}</Button>
          {/if}
          <Button variant="solid" color="primary" onClick={next}>{label}</Button>
        </div>
      </footer>
    </div>
  {/if}
</Modal>

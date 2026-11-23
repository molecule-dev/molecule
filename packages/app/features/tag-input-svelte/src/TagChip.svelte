<!--
  TagChip: the Svelte counterpart of `@molecule/app-tag-input-react`'s
  `TagChip` — a small labeled chip with an optional remove button. Same props
  (React names), same ClassMap tokens, same DOM for the same input. The label
  is the `children` snippet.

  The chip body action is keyboard-operable. With no remove button the chip
  itself is the control (`role="button"`, tabbable, Enter / Space); with a
  remove button the action moves onto a native button around the label text,
  since a button may not contain another control.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { TagChipProps } from './types.js'

  let { children, onRemove, onClick, className }: TagChipProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const chipClass = $derived(
    cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 2),
      cm.sp('py', 1),
      cm.textSize('xs'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      className,
    ),
  )
  const bodyClass = $derived(cm.cn(chipClass, cm.cursorPointer))
  const removeClass = $derived(
    cm.cn(cm.w(4), cm.h(4), cm.flex({ align: 'center', justify: 'center' })),
  )
  const removeLabel = $derived(t('tagChip.remove', {}, { defaultValue: 'Remove' }))

  // React puts the chip's label control on a native button whose background,
  // border, padding, font and colour are reset inline. The CSSOM property
  // writes below are the same ones React makes, so the DOM reads the same
  // (cssText parsing would normalize them differently).
  let labelButton: HTMLButtonElement | undefined = $state()

  $effect(() => {
    if (!labelButton) return
    const { style } = labelButton
    style.background = 'transparent'
    style.border = 'none'
    style.padding = '0'
    style.font = 'inherit'
    style.color = 'inherit'
  })

  /**
   * Keyboard activation for the chip body — the same handler the mouse click
   * runs. `preventDefault()` suppresses Space's page scroll and Enter's form
   * submission when a chip sits inside a form.
   *
   * @param e - DOM keyboard event.
   */
  const handleBodyKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    onClick?.()
  }
</script>

{#if onClick && !onRemove}
  <span
    class={bodyClass}
    role="button"
    tabindex="0"
    onclick={onClick}
    onkeydown={handleBodyKeyDown}
  >
    <span>{@render children?.()}</span>
  </span>
{:else}
  <span class={chipClass}>
    {#if onClick}
      <button
        bind:this={labelButton}
        type="button"
        onclick={onClick}
        class={cm.cn(cm.cursorPointer)}
      >
        <span>{@render children?.()}</span>
      </button>
    {:else}
      <span>{@render children?.()}</span>
    {/if}
    {#if onRemove}
      <button type="button" onclick={onRemove} aria-label={removeLabel} class={removeClass}>
        ×
      </button>
    {/if}
  </span>
{/if}

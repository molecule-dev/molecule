<!--
  TimeSlotPicker: the Svelte counterpart of `@molecule/app-time-slot-picker-react`'s
  `TimeSlotPicker` — a radiogroup of selectable delivery / appointment slots,
  each with a label and an optional meta line, in a list or a fixed-column grid.
  Same props (React names), same DOM for the same input, and the same
  `onSelect(slot)` calls. Selection is conveyed by `aria-checked` plus a bolder
  label only; the component keeps no state.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { TimeSlot, TimeSlotPickerProps } from './types.js'

  let {
    slots,
    selectedId,
    onSelect,
    layout = 'list',
    columns = 2,
    title,
    className,
  }: TimeSlotPickerProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the label re-runs on a locale switch the way React's render-time
  // `t` call re-runs on a re-render.
  const ariaLabel = $derived(
    typeof title === 'string' && title !== ''
      ? title
      : t('timeSlot.aria', {}, { defaultValue: 'Time slots' }),
  )

  /**
   * One slot button's class list (React's selected / unselected weight switch).
   *
   * @param slot - The slot.
   * @returns The class string.
   */
  const buttonClass = (slot: TimeSlot): string =>
    cm.cn(
      cm.flex({ direction: 'col', align: 'start' }),
      cm.sp('p', 3),
      cm.textSize('sm'),
      slot.id === selectedId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )

  /**
   * React's guarded click: a disabled slot never calls `onSelect`.
   *
   * @param slot - The clicked slot.
   */
  const pick = (slot: TimeSlot): void => {
    if (!slot.disabled) onSelect?.(slot)
  }
</script>

<div class={cm.cn(cm.stack(2), className)}>
  {#if title}
    <PresentWhileContent tag="h3" class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if typeof title === 'string'}{title}{:else}{@render title?.()}{/if}
    </PresentWhileContent>
  {/if}
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    class={layout === 'grid' ? cm.grid({ cols: columns, gap: 'sm' }) : cm.stack(2)}
  >
    {#each slots as slot (slot.id)}
      <button
        type="button"
        role="radio"
        aria-checked={slot.id === selectedId ? 'true' : 'false'}
        disabled={slot.disabled}
        onclick={() => pick(slot)}
        class={buttonClass(slot)}
        style={slot.disabled ? 'opacity: 0.4' : undefined}
      >
        <span>
          {#if typeof slot.label === 'string'}{slot.label}{:else}{@render slot.label?.()}{/if}
        </span>
        {#if slot.meta}
          <span class={cm.textSize('xs')}>
            {#if typeof slot.meta === 'string'}{slot.meta}{:else}{@render slot.meta?.()}{/if}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</div>

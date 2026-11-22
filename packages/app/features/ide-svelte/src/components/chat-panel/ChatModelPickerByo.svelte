<!--
  React's section “Host-provided seam to the BYO” (ChatPanel.tsx lines
  7053–7107): the host-provided seam to the BYO ("bring your own AI")
  management surface — hidden when the host passes no callback. Rendered as an
  ANCHORED footer action bar OUTSIDE the scrolling list (flexShrink: 0 in the
  picker's column layout) so it stays visible at any scroll position. Still the
  last arrow-key index (visibleModels.length) — when selected, the footer
  highlights — and Enter/click close the picker and invoke the callback.
  Primary color-mix tint = the same idiom as the per-row "current" pill (the hex
  is only the var() fallback; the theme token wins).

  View only: the callback and the open picker's cursor come from `ctx`.
-->
<script lang="ts">
  import type { Action } from 'svelte/action'

  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  /** The footer's resting tint (the picker's own primary color-mix idiom). */
  const RESTING_BACKGROUND =
    'color-mix(in srgb, var(--mol-color-primary, #6366f1) 12%, transparent)'
  /** The footer's tint while it is the picker's highlighted (last) row. */
  const HIGHLIGHTED_BACKGROUND =
    'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'

  /**
   * Applies React's inline style to the footer button, one property at a time.
   *
   * React assigns each style property through the CSSOM; Svelte assigns an
   * interpolated `style` attribute as one declaration list, and a CSSOM parse
   * of that list drops a `border-top` whose color is a `color-mix()` when the
   * `border` shorthand is present (the shorthand's own expansion wins). Setting
   * the properties individually — in React's order — yields the same inline
   * style React produces. `selected` is the picker's footer-highlight state.
   *
   * @param node - The footer button.
   * @param selected - Whether the footer is the picker's highlighted row.
   * @returns The action's `update` hook for a cursor change.
   */
  const manageButtonStyles: Action<HTMLButtonElement, boolean> = (
    node: HTMLButtonElement,
    selected: boolean,
  ): { update: (selected: boolean) => void } => {
    /**
     * Re-applies the inline style for a cursor state.
     *
     * @param isSelected - Whether the footer is the picker's highlighted row.
     */
    const apply = (isSelected: boolean): void => {
      node.style.flexShrink = '0'
      node.style.padding = '9px 12px'
      node.style.border = 'none'
      node.style.borderTop =
        '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)'
      node.style.color = 'var(--mol-color-primary, #6366f1)'
      node.style.cursor = 'pointer'
      node.style.textAlign = 'center'
      node.style.background = isSelected ? HIGHLIGHTED_BACKGROUND : RESTING_BACKGROUND
    }
    apply(selected)
    return { update: apply }
  }
</script>

{#if ctx.props.onManageCustomModels}
  <button
    type="button"
    data-mol-id="chat-model-manage-custom"
    onclick={() => {
      const picker = ctx.composer.modelPicker
      const manageMode =
        picker?.mode === 'plan' || picker?.mode === 'execute' ? picker.mode : ctx.chat.liveModelMode
      ctx.composer.setModelPicker(null)
      ctx.composer.setInputValue('')
      ctx.props.onManageCustomModels?.({ mode: manageMode })
    }}
    onmouseenter={(event) => {
      event.currentTarget.style.background = HIGHLIGHTED_BACKGROUND
    }}
    onmouseleave={(event) => {
      event.currentTarget.style.background =
        ctx.composer.modelPicker?.selectedIdx === ctx.pickers.visibleModels.length
          ? HIGHLIGHTED_BACKGROUND
          : RESTING_BACKGROUND
    }}
    class={ctx.env.cm.cn(
      ctx.env.cm.textSize('xs'),
      ctx.env.cm.fontWeight('medium'),
      ctx.env.cm.w('full'),
    )}
    use:manageButtonStyles={ctx.composer.modelPicker?.selectedIdx ===
      ctx.pickers.visibleModels.length}
  >
    {ctx.env.t('ide.chat.manageCustomModels', undefined, {
      defaultValue: 'Add or manage your own models…',
    })}
  </button>
{/if}

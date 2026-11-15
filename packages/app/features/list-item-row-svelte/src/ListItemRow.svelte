<!--
  ListItemRow: the Svelte counterpart of `@molecule/app-list-item-row-react`'s
  `ListItemRow` — generic "thumbnail + text + actions" row: leading slot, up to
  three text lines (title / subtitle / metadata), right-side actions. Same
  props (React names), same DOM for the same input.

  The `svelte-ignore` pairs below mark the trade-off React's package documents:
  with `onClick` the row is a clickable div WITHOUT button semantics — wrap it
  in your own button/link (or add key handling) where keyboard access matters.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ListItemRowProps } from './types.js'

  let {
    title,
    subtitle,
    metadata,
    leading,
    actions,
    onClick,
    selected,
    disabled,
    density = 'comfortable',
    className,
  }: ListItemRowProps = $props()

  const cm = $derived(getClassMap())
  const clickable = $derived(Boolean(onClick) && !disabled)
  const padY = $derived(density === 'compact' ? 2 : 3)
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  role={onClick ? 'button' : undefined}
  tabindex={clickable ? 0 : undefined}
  aria-selected={selected}
  aria-disabled={disabled}
  onclick={disabled ? undefined : onClick}
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('px', 3),
    cm.sp('py', padY),
    clickable ? cm.cursorPointer : undefined,
    className,
  )}
  style:opacity={disabled ? 0.5 : undefined}
>
  {#if leading}
    <div class={cm.shrink0}>
      {#if typeof leading === 'function'}{@render leading()}{:else}{leading}{/if}
    </div>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(0))}>
    <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
    </div>
    {#if subtitle}
      <div class={cm.textSize('sm')}>
        {#if typeof subtitle === 'function'}{@render subtitle()}{:else}{subtitle}{/if}
      </div>
    {/if}
    {#if metadata}
      <div class={cm.textSize('xs')}>
        {#if typeof metadata === 'function'}{@render metadata()}{:else}{metadata}{/if}
      </div>
    {/if}
  </div>
  {#if actions}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class={cm.shrink0} onclick={(event) => event.stopPropagation()}>
      {#if typeof actions === 'function'}{@render actions()}{:else}{actions}{/if}
    </div>
  {/if}
</div>

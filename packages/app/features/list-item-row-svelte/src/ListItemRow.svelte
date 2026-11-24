<!--
  ListItemRow: the Svelte counterpart of `@molecule/app-list-item-row-react`'s
  `ListItemRow` — generic "thumbnail + text + actions" row: leading slot, up to
  three text lines (title / subtitle / metadata), right-side actions. Same
  props (React names), same DOM for the same input. With `onClick` the whole
  row is clickable through a transparent native button over it, named by the
  title, and the `actions` slot sits above it and keeps its own clicks.
-->
<script lang="ts">
  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { OptimisticToggleButton } from '@molecule/app-ui-svelte'

  import type { ListItemRowProps } from './types.js'

  let {
    title,
    subtitle,
    metadata,
    leading,
    actions,
    toggle,
    onClick,
    selected,
    disabled,
    density = 'comfortable',
    className,
  }: ListItemRowProps = $props()

  const cm = $derived(getClassMap())
  const nameId = $props.id()
  const padY = $derived(density === 'compact' ? 2 : 3)
</script>

<div
  aria-current={selected ? 'true' : undefined}
  aria-disabled={disabled}
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('px', 3),
    cm.sp('py', padY),
    onClick ? cm.position('relative') : undefined,
    className,
  )}
  style:opacity={disabled ? 0.5 : undefined}
>
  {#if onClick}
    <!-- mol-bespoke-button: the whole row is the hit area, not a CTA — an
       empty, transparent button over the row; the inline background/border/
       padding are native resets. React writes the shorthand `border: 'none'`
       and `padding: 0`, which the CSSOM serializes as `border: medium` and
       `0px` — Svelte writes the style attribute directly, so the port writes
       that same serialized form (identical computed style). -->
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="list-item-row-open"
      {disabled}
      onclick={() => {
        if (!disabled) onClick?.()
      }}
      class={cm.cn(cm.position('absolute'), cm.inset0, disabled ? undefined : cm.cursorPointer)}
      style="background: transparent; border: medium; padding: 0px"
    ></button>
  {/if}
  {#if leading}
    <PresentWhileContent class={cm.shrink0}>
      {#if typeof leading === 'function'}{@render leading?.()}{:else}{leading}{/if}
    </PresentWhileContent>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(0))}>
    <div
      id={onClick ? nameId : undefined}
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
    >
      {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
    </div>
    {#if subtitle}
      <div class={cm.textSize('sm')}>
        {#if typeof subtitle === 'function'}{@render subtitle?.()}{:else}{subtitle}{/if}
      </div>
    {/if}
    {#if metadata}
      <div class={cm.textSize('xs')}>
        {#if typeof metadata === 'function'}{@render metadata?.()}{:else}{metadata}{/if}
      </div>
    {/if}
  </div>
  {#if toggle || actions}
    <PresentWhileContent class={cm.cn(cm.shrink0, cm.position('relative'))}
      >{#if toggle}<OptimisticToggleButton
          {...toggle}
        />{/if}{#if actions}{#if typeof actions === 'function'}{@render actions?.()}{:else}{actions}{/if}{/if}</PresentWhileContent
    >
  {/if}
</div>

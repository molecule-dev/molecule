<!--
  TickerRow: the Svelte counterpart of `@molecule/app-ticker-row-react`'s
  `TickerRow` — financial ticker row: symbol + price + change% + optional
  icon, sparkline and meta. Same props (React names), same DOM for the same
  input; the change color is applied inline via the CSSOM and the layout and
  type classes come from the ClassMap bond.

  The `svelte-ignore` pair below marks the trade-off React's package documents:
  with `onClick` the row is a clickable div WITHOUT button semantics — wrap it
  in your own button/link (or add key handling) where keyboard access matters.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { TickerRowProps } from './types.js'

  let {
    symbol,
    name,
    icon,
    price,
    changePct,
    changeDisplay,
    sparkline,
    meta,
    onClick,
    className,
  }: TickerRowProps = $props()

  const POSITIVE_COLOR = '#22c55e'
  const NEGATIVE_COLOR = '#ef4444'

  const cm = $derived(getClassMap())
  const positive = $derived(changePct !== undefined && changePct > 0)
  const negative = $derived(changePct !== undefined && changePct < 0)
  const color = $derived(positive ? POSITIVE_COLOR : negative ? NEGATIVE_COLOR : undefined)
  const arrow = $derived(positive ? '▲' : negative ? '▼' : '–')
  const showChange = $derived(changeDisplay !== undefined || changePct !== undefined)
  // React's `` `${changePct?.toFixed(2)}%` `` — a defined `changeDisplay` wins,
  // so this only shows alongside a `changePct`.
  const formatted = $derived(`${changePct?.toFixed(2)}%`)
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('py', 2),
    onClick ? cm.cursorPointer : undefined,
    className,
  )}
  onclick={onClick}
>
  {#if icon}
    <div class={cm.shrink0}>
      {#if typeof icon === 'function'}{@render icon()}{:else}{icon}{/if}
    </div>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(0))}>
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
      {#if typeof symbol === 'function'}{@render symbol()}{:else}{symbol}{/if}
    </span>
    {#if name}
      <span class={cm.textSize('xs')}>
        {#if typeof name === 'function'}{@render name()}{:else}{name}{/if}
      </span>
    {/if}
  </div>
  {#if sparkline}
    <div class={cm.shrink0}>
      {#if typeof sparkline === 'function'}{@render sparkline()}{:else}{sparkline}{/if}
    </div>
  {/if}
  <div class={cm.cn(cm.textCenter, cm.stack(0))}>
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if typeof price === 'function'}{@render price()}{:else}{price}{/if}
    </span>
    {#if showChange}
      <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))} use:reactStyle={{ color }}>
        {arrow +
          ' '}{#if typeof changeDisplay === 'function'}{@render changeDisplay()}{:else}{changeDisplay ??
            formatted}{/if}
      </span>
    {/if}
  </div>
  {#if meta}
    <div class={cm.cn(cm.textSize('xs'), cm.shrink0)}>
      {#if typeof meta === 'function'}{@render meta()}{:else}{meta}{/if}
    </div>
  {/if}
</div>

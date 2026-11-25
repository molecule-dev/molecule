<!--
  TickerRow: the Svelte counterpart of `@molecule/app-ticker-row-react`'s
  `TickerRow` — financial ticker row: symbol + price + change% + optional
  icon, sparkline and meta. Same props (React names), same DOM for the same
  input, and the same i18n keys; the layout and type classes come from the
  ClassMap bond. While `onClick` is set the whole row is clickable through a
  transparent native button laid over it, named by the symbol; the inner
  controls (the `meta` slot) sit above that button and keep their own clicks.
  A native button turns Enter and Space into the same click itself.

  Inline styles go through the `reactStyle` action (CSSOM property setters),
  exactly as React's runtime applies them, so values normalize the same way.
  The change span's children are glued onto one line: it is inline, so a line
  break between them would draw whitespace React does not render.
-->
<script lang="ts">
  import { PresentWhileContent, useLocale, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { type CSSStyle, reactStyle } from '@molecule/app-ui-svelte'

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

  /** The id that names the open button (Svelte's `$props.id`), on the symbol. */
  const nameId: string = $props.id()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  // Read through `$activeLocale` in the deriveds, so the formatted percentage
  // follows a locale switch (React's `useLocale()`).
  const activeLocale = useLocale()

  const clickable = $derived(typeof onClick === 'function')
  const positive = $derived(changePct !== undefined && changePct > 0)
  const negative = $derived(changePct !== undefined && changePct < 0)
  const colorClass = $derived(positive ? cm.textSuccess : negative ? cm.textError : undefined)
  const arrow = $derived(positive ? '▲' : negative ? '▼' : '–')
  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const directionLabel = $derived(
    positive
      ? t('tickerRow.change.up', {}, { defaultValue: 'Up' })
      : negative
        ? t('tickerRow.change.down', {}, { defaultValue: 'Down' })
        : t('tickerRow.change.flat', {}, { defaultValue: 'Unchanged' }),
  )
  const showChange = $derived(changeDisplay !== undefined || changePct !== undefined)
  // React's `changeDisplay ?? Intl…format(changePct / 100)`: a defined display
  // wins, else the percentage in the app's active locale (the pair is never
  // both absent when this renders).
  const formatted = $derived(
    changePct !== undefined
      ? new Intl.NumberFormat($activeLocale, {
          style: 'percent',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(changePct / 100)
      : '',
  )

  /** The open button's native resets (React's transparent-cover style). */
  const openStyle: CSSStyle = {
    background: 'transparent',
    border: 'none',
    padding: '0px',
  }
</script>

<div
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('py', 2),
    onClick ? cm.position('relative') : undefined,
    onClick ? cm.cursorPointer : undefined,
    className,
  )}
>
  {#if clickable}
    <!-- The row's open action: an empty, transparent native button covering
      the whole row (Enter / Space activate it natively), named by the symbol.
      A sibling of the row's other content, not their wrapper. -->
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="ticker-row-open"
      onclick={() => onClick?.()}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      use:reactStyle={openStyle}
    ></button>
  {/if}
  {#if icon}
    <PresentWhileContent class={cm.shrink0}>
      {#if typeof icon === 'function'}{@render icon?.()}{:else}{icon}{/if}
    </PresentWhileContent>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(0))}>
    <!-- The id names the open button (React's `aria-labelledby`). -->
    <span
      id={clickable ? nameId : undefined}
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
    >
      {#if typeof symbol === 'function'}{@render symbol?.()}{:else}{symbol}{/if}
    </span>
    {#if name}
      <span class={cm.textSize('xs')}>
        {#if typeof name === 'function'}{@render name?.()}{:else}{name}{/if}
      </span>
    {/if}
  </div>
  {#if sparkline}
    <PresentWhileContent class={cm.shrink0}>
      {#if typeof sparkline === 'function'}{@render sparkline?.()}{:else}{sparkline}{/if}
    </PresentWhileContent>
  {/if}
  <div class={cm.cn(cm.textCenter, cm.stack(0))}>
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if typeof price === 'function'}{@render price?.()}{:else}{price}{/if}
    </span>
    {#if showChange}
      <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), colorClass)}
        ><span aria-hidden="true">{arrow}</span><span class={cm.cn(cm.srOnly)}
          ><!-- The direction in words for screen readers; the arrow is read
          aloud as a glyph otherwise. -->{directionLabel}</span
        >&#32;{#if typeof changeDisplay === 'function'}{@render changeDisplay?.()}{:else}{changeDisplay ??
            formatted}{/if}</span
      >
    {/if}
  </div>
  {#if meta}
    <!-- Raised above the open button in its positioned wrapper while the row
      is clickable, so a click on its content lands here and keeps its own
      clicks. -->
    <PresentWhileContent
      class={cm.cn(cm.textSize('xs'), cm.shrink0, onClick ? cm.position('relative') : undefined)}
    >
      {#if typeof meta === 'function'}{@render meta?.()}{:else}{meta}{/if}
    </PresentWhileContent>
  {/if}
</div>

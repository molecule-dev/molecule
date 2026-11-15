<!--
  CurrencyDisplay: the Svelte counterpart of
  `@molecule/app-currency-display-react`'s `CurrencyDisplay` — an amount, an
  optional strikethrough original price and a "saved X%" chip. Same props
  (React names), same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { formatCurrency, formatCurrencyCompact } from './formatCurrency.js'
  import type { CurrencyDisplayProps } from './types.js'

  let {
    amount,
    originalAmount,
    currency = 'USD',
    locale,
    size = 'md',
    compact = false,
    showSavings = true,
    savingsLabel,
    className,
  }: CurrencyDisplayProps = $props()

  /** The text-size token each React `size` value resolves to. */
  const SIZE_CLASS = {
    sm: 'sm',
    md: 'base',
    lg: 'xl',
    xl: '3xl',
  } as const

  const cm = $derived(getClassMap())
  const sizeClass = $derived(SIZE_CLASS[size])
  const fmt = $derived(compact ? formatCurrencyCompact : formatCurrency)
  const discount = $derived.by(() => {
    // React's condition: an original amount above the current one.
    if (originalAmount === undefined || originalAmount <= amount) return undefined
    const saved = originalAmount - amount
    return {
      original: originalAmount,
      saved,
      pct: originalAmount > 0 ? Math.round((saved / originalAmount) * 100) : 0,
    }
  })
  const amountText = $derived(fmt(amount, currency, locale))
</script>

<span class={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), className)}>
  <span class={cm.cn(cm.textSize(sizeClass), cm.fontWeight('bold'))}>{amountText}</span>
  {#if discount}
    <span class={cm.cn(cm.textSize('sm'))} style="text-decoration: line-through">
      {fmt(discount.original, currency, locale)}
    </span>
    {#if showSavings}
      <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
        {savingsLabel ? savingsLabel(discount.saved, discount.pct) : `−${discount.pct}%`}
      </span>
    {/if}
  {/if}
</span>

<!--
  PriceRangeSlider: the Svelte counterpart of `@molecule/app-price-range-slider-react`'s
  `PriceRangeSlider` — dual-handle numeric range slider using two native
  `<input type="range">` controls with formatted endpoint labels. Same props,
  same DOM for the same input; the handles clamp against each other so
  `low <= high` always holds. The optional `label` is a snippet.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { PriceRangeSliderProps } from './types.js'

  let {
    min,
    max,
    value,
    onChange,
    step = 1,
    formatValue,
    label,
    className,
  }: PriceRangeSliderProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const low = $derived(value[0])
  const high = $derived(value[1])
  const minLabel = $derived(
    t('priceRangeSlider.aria.minimum', undefined, { defaultValue: 'Minimum' }),
  )
  const maxLabel = $derived(
    t('priceRangeSlider.aria.maximum', undefined, { defaultValue: 'Maximum' }),
  )

  /**
   * Formats an endpoint label: the caller's `formatValue`, else the USD
   * default (`$1,000`).
   * @param n - The endpoint value.
   * @returns The formatted label.
   */
  const fmt = (n: number): string => (formatValue ? formatValue(n) : `$${n.toLocaleString()}`)

  // React's range-input `onChange` fires on the native `input` event, and a
  // controlled input is restored to the prop value right after the change
  // handler returns.
  const handleMin = (event: Event): void => {
    const element = event.currentTarget as HTMLInputElement
    onChange?.([Math.min(Number(element.value), high), high])
    element.value = String(low)
  }
  const handleMax = (event: Event): void => {
    const element = event.currentTarget as HTMLInputElement
    onChange?.([low, Math.max(Number(element.value), low)])
    element.value = String(high)
  }

  /**
   * Applies React's controlled `value` to a native input: the property AND the
   * content attribute (via the `defaultValue` property), re-applied when the
   * prop changes.
   * @param node - The input element.
   * @param current - The controlled value.
   * @returns The action with an update that re-applies on prop changes.
   */
  function rangeValue(node: HTMLInputElement, current: number): { update(next: number): void } {
    const apply = (text: string): void => {
      if (node.value !== text) node.value = text
      if (node.defaultValue !== text) node.defaultValue = text
    }
    apply(String(current))
    return { update: (next: number) => apply(String(next)) }
  }
</script>

<div class={cm.cn(cm.stack(2), className)}>
  {#if label}
    <PresentWhileContent tag="span" class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
      >{@render label?.()}</PresentWhileContent
    >
  {/if}
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    <span class={cm.textSize('sm')}>{fmt(low)}</span>
    <input
      type="range"
      {min}
      {max}
      {step}
      use:rangeValue={low}
      oninput={handleMin}
      class={cm.flex1}
      aria-label={minLabel}
    />
    <input
      type="range"
      {min}
      {max}
      {step}
      use:rangeValue={high}
      oninput={handleMax}
      class={cm.flex1}
      aria-label={maxLabel}
    />
    <span class={cm.textSize('sm')}>{fmt(high)}</span>
  </div>
</div>

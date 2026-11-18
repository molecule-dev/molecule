<!--
  AdjustmentSlider: the Svelte counterpart of
  `@molecule/app-adjustment-slider-react`'s `AdjustmentSlider` — a bipolar
  (zero-center) labelled `<input type="range">` with a center mark at zero,
  a value display that doubles as the reset button, double-click reset and
  Shift+arrow nudging. Same props (React names), same ClassMap tokens and the
  same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { AdjustmentSliderProps } from './types.js'
  import { clampStep, defaultFormatter, defaultResetValue, keyboardNudge } from './utilities.js'

  let {
    label,
    value,
    onChange,
    min = -100,
    max = 100,
    step = 1,
    bipolar = true,
    unit,
    format,
    onReset,
    className,
    dataMolId,
  }: AdjustmentSliderProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const formatter = $derived(format ?? defaultFormatter(unit))
  const display = $derived(formatter(value))
  const showCenterMark = $derived(bipolar && min < 0 && max > 0)
  // Position center mark proportionally between min..max (0..100%).
  const centerPct = $derived(showCenterMark ? ((0 - min) / (max - min)) * 100 : 50)
  const resetAria = $derived(
    t('adjustmentSlider.reset.aria', { label }, { defaultValue: 'Reset {{label}}' }),
  )
  const sliderAria = $derived(t('adjustmentSlider.aria', { label }, { defaultValue: '{{label}}' }))

  /**
   * Emits a value through `onChange`, clamped + step-snapped, and only when it
   * differs from the current controlled value (React's `emit`).
   * @param next - The proposed value.
   */
  const emit = (next: number): void => {
    const normalized = clampStep(next, min, max, step)
    if (normalized !== value) onChange(normalized)
  }

  /** Resets the value: `onReset` when supplied, otherwise the default target. */
  const performReset = (): void => {
    if (onReset) {
      onReset()
      return
    }
    emit(defaultResetValue(min, bipolar))
  }

  /**
   * Handles the native `input` event: emits the typed value, then applies
   * React's controlled-input restore (the DOM value returns to the prop).
   * @param event - The native input event.
   */
  const handleChange = (event: Event): void => {
    const element = event.currentTarget as HTMLInputElement
    emit(Number(element.value))
    element.value = String(value)
  }

  /**
   * Intercepts Shift + arrow keys and nudges by ten steps (the native range
   * input already handles plain arrows).
   * @param event - The native keydown event.
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.shiftKey) return
    const delta = keyboardNudge(step, true)
    let next: number | undefined
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = value + delta
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = value - delta
    if (next === undefined) return
    event.preventDefault()
    emit(next)
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

<div class={cm.cn(cm.stack(1), className)} data-mol-id={dataMolId ?? 'adjustment-slider'}>
  <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{label}</span>
    <button
      type="button"
      onclick={performReset}
      aria-label={resetAria}
      class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact)}
      data-mol-id="adjustment-slider-reset"
    >
      {display}
    </button>
  </div>
  <div style="position: relative">
    {#if showCenterMark}
      <span
        aria-hidden="true"
        data-mol-id="adjustment-slider-center-mark"
        style:position="absolute"
        style:left={`${centerPct}%`}
        style:top="50%"
        style:width="1px"
        style:height="8px"
        style:transform="translate(-50%, -50%)"
        style:background="currentColor"
        style:opacity="0.5"
        style:pointer-events="none"
      ></span>
    {/if}<input
      type="range"
      {min}
      {max}
      {step}
      use:rangeValue={value}
      oninput={handleChange}
      onkeydown={handleKeyDown}
      ondblclick={performReset}
      aria-label={sliderAria}
      data-mol-id="adjustment-slider-input"
      style="width: 100%"
    />
  </div>
</div>

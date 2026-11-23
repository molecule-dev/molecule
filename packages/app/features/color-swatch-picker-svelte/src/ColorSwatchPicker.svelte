<!--
  ColorSwatchPicker: the Svelte counterpart of
  `@molecule/app-color-swatch-picker-react`'s `ColorSwatchPicker` — a grid of
  colored circles with single-select state. Same props, same DOM for the same
  input; the node-valued `preview` prop is a snippet.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ColorSwatchPickerProps } from './types.js'

  let {
    swatches,
    value,
    onChange,
    size = 28,
    gap = 'sm',
    preview,
    className,
    ariaLabel,
  }: ColorSwatchPickerProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.stack(2), className)}>
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    class={cm.flex({ align: 'center', gap, wrap: 'wrap' })}
  >
    {#each swatches as s (s.value)}
      {@const selected = s.value === value}
      <button
        type="button"
        role="radio"
        aria-checked={selected ? 'true' : 'false'}
        aria-label={s.label ?? s.value}
        data-mol-id={`color-swatch-${s.value}`}
        data-selected={selected ? 'true' : 'false'}
        onclick={() => onChange?.(s.value)}
        class={cm.cn(cm.roundedFull, cm.cursorPointer, cm.touchTargetCompact)}
        style={`width:${size}px;height:${size}px;background:${s.color};outline:${selected ? '2px solid currentColor' : 'none'};outline-offset:2px;border:none`}
      ></button>
    {/each}
  </div>
  {#if preview}{@render preview?.()}{/if}
</div>

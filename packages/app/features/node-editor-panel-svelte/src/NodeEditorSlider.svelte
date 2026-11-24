<!--
  NodeEditorSlider: the Svelte counterpart of
  `@molecule/app-node-editor-panel-react`'s `NodeEditorSlider` — a range input
  inside a labeled section, with the mono-font value chip on the right of the
  label row. Same props (React names), same ClassMap tokens, same DOM for the
  same input.
-->
<script lang="ts">
  import { contentNodes } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import NodeEditorSection from './NodeEditorSection.svelte'
  import type { NodeEditorSliderProps } from './types.js'
  import { rangeValue } from './utilities.js'

  let {
    label,
    value,
    onChange,
    min = 0,
    max = 1,
    step = 0.1,
    valueDisplay,
  }: NodeEditorSliderProps = $props()

  const cm = $derived(getClassMap())
  // Names the range input through the section's `<label for>`.
  const inputId = $props.id()

  /**
   * Parses the range input's value, reports it, then restores the controlled
   * value in the DOM as React does after a change.
   * @param event - The native change event.
   */
  const handleChange = (event: Event): void => {
    const element = event.currentTarget as HTMLInputElement
    onChange(parseFloat(element.value))
    element.value = String(value)
  }

  // React's `slot(valueDisplay) ?? value`: a value-display snippet that renders nothing (an empty
  // list, or the empty string) falls back to the numeric value, like an omitted one. A snippet's
  // `{#each}` over no rows changes the DOM without changing the prop, so presence is read from the
  // rendered chip; the numeric value (the fallback text) is tracked by its node count.
  let chipEl = $state<HTMLSpanElement | null>(null)
  let displayRenders = $state(true)
  let valueCount: number | null = null
  $effect(() => {
    const element = chipEl
    void valueDisplay
    if (!element) return
    const isSnippet = typeof valueDisplay === 'function'
    const count = (): number =>
      contentNodes(element).filter(
        (node) => node.nodeType === 1 || (node.textContent ?? '').trim() !== '',
      ).length
    const sync = (): void => {
      if (!isSnippet) {
        if (displayRenders) displayRenders = false
        valueCount = null
        return
      }
      if (displayRenders) {
        if (count() > 0) return
        displayRenders = false
        valueCount = null
        return
      }
      const now = count()
      if (valueCount === null) valueCount = now
      else if (now !== valueCount) {
        displayRenders = true
        valueCount = null
      }
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(element, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  })
</script>

{#snippet trailing()}
  <span
    bind:this={chipEl}
    class={cm.cn(cm.textSize('xs'), cm.sp('px', 2), cm.nodeEditorPanelSliderValue)}
  >
    {#if typeof valueDisplay === 'function'}
      {@render valueDisplay?.()}
    {:else if valueDisplay != null && valueDisplay !== ''}
      {valueDisplay}
    {/if}
    {#if typeof valueDisplay === 'function' ? !displayRenders : !(valueDisplay != null && valueDisplay !== '')}
      {value}
    {/if}
  </span>
{/snippet}

<NodeEditorSection {label} {trailing} htmlFor={inputId}>
  <input
    class={cm.cn(cm.w('full'), cm.h(1.5), cm.cursorPointer, cm.nodeEditorPanelSliderTrack)}
    id={inputId}
    aria-valuetext={typeof valueDisplay === 'string' && valueDisplay !== ''
      ? valueDisplay
      : undefined}
    {min}
    {max}
    {step}
    type="range"
    use:rangeValue={value}
    onchange={handleChange}
  />
</NodeEditorSection>

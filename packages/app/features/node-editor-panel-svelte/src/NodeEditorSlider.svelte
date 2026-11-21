<!--
  NodeEditorSlider: the Svelte counterpart of
  `@molecule/app-node-editor-panel-react`'s `NodeEditorSlider` — a range input
  inside a labeled section, with the mono-font value chip on the right of the
  label row. Same props (React names), same ClassMap tokens, same DOM for the
  same input.
-->
<script lang="ts">
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
</script>

{#snippet trailing()}
  <span class={cm.cn(cm.textSize('xs'), cm.sp('px', 2), cm.nodeEditorPanelSliderValue)}>
    {#if valueDisplay !== undefined && valueDisplay !== null}
      {#if typeof valueDisplay === 'function'}{@render valueDisplay()}{:else}{valueDisplay}{/if}
    {:else}{value}{/if}
  </span>
{/snippet}

<NodeEditorSection {label} {trailing} htmlFor={inputId}>
  <input
    class={cm.cn(cm.w('full'), cm.h(1.5), cm.cursorPointer, cm.nodeEditorPanelSliderTrack)}
    id={inputId}
    aria-valuetext={typeof valueDisplay === 'string' ? valueDisplay : undefined}
    {min}
    {max}
    {step}
    type="range"
    use:rangeValue={value}
    onchange={handleChange}
  />
</NodeEditorSection>

<!--
  NodeEditorRadioGroup: the Svelte counterpart of
  `@molecule/app-node-editor-panel-react`'s `NodeEditorRadioGroup` — a radio
  list with the chatbot-builder's custom radio-dot rendering. Each option is a
  labeled tile around a visually hidden native radio sharing one generated
  group name, so the set is a real radio group. Same props (React names), same
  ClassMap tokens, same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { NodeEditorRadioGroupProps } from './types.js'
  import { generatedName, radioValue, reflectChecked } from './utilities.js'

  let { options, value, onChange }: NodeEditorRadioGroupProps = $props()

  const cm = $derived(getClassMap())
  // One name per group: the browser's arrow keys and screen readers treat the
  // radios as one set.
  const name = generatedName()

  /**
   * Reports the selected option, then restores the radio group's live
   * `checked` state to the controlled value — React restores controlled inputs
   * after an event even when the render output is unchanged.
   * @param next - The option that was selected.
   * @param event - The native change event.
   */
  const handleChange = (next: string, event: Event): void => {
    onChange(next)
    const group = (event.target as HTMLElement).closest('[role="radiogroup"]')
    if (!group) return
    for (const input of Array.from(
      group.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    )) {
      input.checked = input.value === value
    }
  }
</script>

<div role="radiogroup" class={cm.cn(cm.grid({ cols: 1, gap: 2 }))}>
  {#each options as option (option.value)}
    <label
      data-mol-id={`node-editor-radio-${option.value}`}
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('p', 3),
        cm.cursorPointer,
        option.value === value ? cm.nodeEditorPanelOptionSelected : cm.nodeEditorPanelOption,
      )}
    >
      <input
        type="radio"
        {name}
        use:radioValue={option.value}
        use:reflectChecked={option.value === value}
        onchange={(event) => handleChange(option.value, event)}
        class={cm.srOnly}
      />
      <span
        class={cm.cn(
          cm.textSize('xs'),
          option.value === value
            ? cm.nodeEditorPanelOptionLabelSelected
            : cm.nodeEditorPanelOptionLabel,
        )}
      >
        {#if typeof option.label === 'function'}{@render option.label()}{:else}{option.label}{/if}
      </span>
      <div
        aria-hidden="true"
        class={cm.cn(
          cm.nodeEditorPanelRadioRing,
          option.value === value
            ? cm.nodeEditorPanelRadioRingSelected
            : cm.nodeEditorPanelRadioRingIdle,
        )}
      >
        {#if option.value === value}
          <div class={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.bgPrimary)}></div>
        {/if}
      </div>
    </label>
  {/each}
</div>

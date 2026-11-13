<!--
  RadioGroup: a native radio group with a unique generated name, label,
  direction, error wiring and option-level disable.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reflectChecked, useGeneratedId } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { RadioGroupProps } from '../types.js'

  let {
    options,
    value,
    onChange,
    size: _size,
    label,
    name,
    direction = 'vertical',
    error,
    className,
    style,
    testId,
    disabled,
  }: RadioGroupProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const generatedName = useGeneratedId()
  const groupName = $derived(name || generatedName)
  const errorId = $derived(`${groupName}-error`)

  let groupEl = $state<HTMLDivElement | null>(null)

  const handleChange = (optionValue: string): void => {
    onChange?.(optionValue)
    // React manages a radio input's checked state even without a `value` prop
    // (radios are always controlled for `checked`): after the change event it
    // restores every radio to `checked === (value === option.value)`.
    if (groupEl) {
      for (const input of groupEl.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
        input.checked = input.value === value
      }
    }
  }
</script>

<div
  bind:this={groupEl}
  class={className}
  use:reactStyle={style}
  data-testid={testId}
  role="radiogroup"
  aria-label={label ?? t('ui.radioGroup.label', undefined, { defaultValue: 'Radio group' })}
  aria-invalid={error ? 'true' : undefined}
  aria-describedby={error ? errorId : undefined}
>
  {#if label}
    <div class={cm.cn(cm.label({ required: false }), cm.sp('mb', 2))}>{label}</div>
  {/if}
  <div class={cm.radioGroupLayout(direction)}>
    {#each options as option (option.value)}
      {@const isDisabled = disabled || option.disabled}
      <label class={cm.cn(cm.controlLabel, isDisabled && cm.controlDisabled)}>
        <input
          type="radio"
          name={groupName}
          value={option.value}
          use:reflectChecked={value === option.value}
          disabled={isDisabled}
          onclick={() => handleChange(option.value)}
          data-state={value === option.value ? 'checked' : 'unchecked'}
          class={cm.cn(cm.radio({ error: !!error }), cm.cursorPointer)}
        />
        <span class={cm.controlText}>{option.label}</span>
      </label>
    {/each}
  </div>
  {#if error}
    <p id={errorId} class={cm.cn(cm.formError, cm.sp('mt', 1))}>{error}</p>
  {/if}
</div>

<!--
  Checkbox: label + input with indeterminate flag and an associated error
  message (aria-describedby). `checked` is reflected to the attribute like
  React renders a controlled input, `defaultChecked` seeds the uncontrolled
  default, and a controlled checkbox is restored after each change event.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { reflectChecked, spreadEvents, useGeneratedId } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { CheckboxProps } from '../types.js'

  let {
    label,
    checked,
    defaultChecked,
    indeterminate,
    size: _size,
    error,
    className,
    style,
    testId,
    disabled,
    name,
    id,
    onChange,
    ...rest
  }: CheckboxProps = $props()

  const cm = $derived(getClassMap())
  const checkboxId = $derived(id || name)
  const generatedId = useGeneratedId()
  const errorId = $derived(`${checkboxId || generatedId}-error`)
  const checkboxClasses = $derived(cm.cn(cm.checkbox({ error: !!error }), className))
  // React's effective checkbox state: the controlled prop wins, else the
  // uncontrolled default.
  const effective = $derived(checked ?? defaultChecked ?? false)

  let inputEl = $state<HTMLInputElement | null>(null)

  $effect(() => {
    if (inputEl) {
      inputEl.indeterminate = !!indeterminate
    }
  })

  // React restores a controlled input's checked state after the change, and
  // its onChange for checkbox/radio inputs fires on the CLICK event (React's
  // own change-event polyfill for those input types).
  const handleChange = (event: MouseEvent): void => {
    onChange?.(event)
    if (checked !== undefined && inputEl) inputEl.checked = !!checked
  }
</script>

<div class={cm.formFieldWrapper}>
  <label class={cm.controlLabel}>
    <input
      bind:this={inputEl}
      type="checkbox"
      id={checkboxId}
      {name}
      use:reflectChecked={effective}
      {disabled}
      data-state={checked ? 'checked' : 'unchecked'}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? errorId : undefined}
      class={checkboxClasses}
      use:reactStyle={style}
      data-testid={testId}
      onclick={handleChange}
      {...reactAttrs(withoutEvents(rest))}
      use:spreadEvents={rest}
    />
    {#if label}
      <span class={cm.cn(cm.controlText, disabled && cm.controlDisabled)}>
        {#if typeof label === 'string'}{label}{:else}{@render label()}{/if}
      </span>
    {/if}
  </label>
  {#if error}
    <p id={errorId} class={cm.cn(cm.formError, cm.sp('mt', 1))}>{error}</p>
  {/if}
</div>

<!--
  Switch: a real role="switch" button backed by a hidden native checkbox —
  the change event dispatched through it is a genuine browser Event, and a
  caller's onClick can veto the toggle with preventDefault().
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { reflectChecked, spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { SwitchProps } from '../types.js'

  let {
    label,
    checked,
    size = 'md',
    color,
    className,
    style,
    testId,
    disabled,
    onChange,
    onClick,
    ...rest
  }: SwitchProps = $props()

  const cm = $derived(getClassMap())
  const dataState = $derived(checked ? 'checked' : 'unchecked')

  let hiddenInput = $state<HTMLInputElement | null>(null)

  // Attached once, reading the latest onChange at event time, so no gap exists
  // between the switch appearing and its listener existing.
  $effect.pre(() => {
    const input = hiddenInput
    if (!input) return
    const listener = (event: Event): void => {
      onChange?.(event)
    }
    input.addEventListener('change', listener)
    return () => input.removeEventListener('change', listener)
  })

  const handleClick = (event: MouseEvent): void => {
    onClick?.(event)
    if (!disabled && !event.defaultPrevented) {
      hiddenInput?.click()
      // React restores a controlled input's checked state after the change
      // event; the hidden checkbox keeps mirroring the `checked` prop.
      if (hiddenInput) hiddenInput.checked = !!checked
    }
  }
</script>

<input
  bind:this={hiddenInput}
  type="checkbox"
  use:reflectChecked={!!checked}
  {disabled}
  aria-hidden="true"
  tabindex="-1"
  class={cm.srOnly}
/>
<label class={cm.cn(cm.controlLabel, disabled && cm.controlDisabled)}>
  <button
    type="button"
    role="switch"
    aria-checked={checked ? 'true' : 'false'}
    {disabled}
    data-state={dataState}
    onclick={handleClick}
    class={cm.cn(cm.switchBase({ size, color }), className)}
    use:reactStyle={style}
    data-testid={testId}
    {...reactAttrs(withoutEvents(rest))}
    use:spreadEvents={rest}
  >
    <span data-state={dataState} class={cm.switchThumb({ size })}></span>
  </button>
  {#if label}
    <span class={cm.controlText}
      >{#if typeof label === 'string'}{label}{:else}{@render label()}{/if}</span
    >
  {/if}
</label>

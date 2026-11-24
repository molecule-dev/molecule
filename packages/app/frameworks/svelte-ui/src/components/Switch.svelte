<!--
  Switch: a real role="switch" button backed by a hidden native checkbox —
  the change event dispatched through it is a genuine browser Event, and a
  caller's onClick can veto the toggle with preventDefault().
-->
<script lang="ts">
  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { reflectChecked, spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { SwitchProps } from '../types.js'

  let {
    ref = $bindable(null),
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

  const handleClick = (event: MouseEvent): void => {
    onClick?.(event)
    if (disabled || event.defaultPrevented) return
    // Resolve the hidden checkbox from the rendered tree instead of a
    // `bind:this` ref: the binding is only assigned when effects flush, so a
    // click that lands in the same task as the mount would find it null and
    // toggle nothing (React attaches its layout-effect listener at commit).
    const target = event.currentTarget
    const input =
      target instanceof HTMLElement ? target.parentElement?.previousElementSibling : null
    if (!(input instanceof HTMLInputElement)) return
    input.click()
    // React restores a controlled input's checked state after the change
    // event; the hidden checkbox keeps mirroring the `checked` prop.
    input.checked = !!checked
  }
</script>

<input
  type="checkbox"
  use:reflectChecked={!!checked}
  {disabled}
  aria-hidden="true"
  tabindex="-1"
  class={cm.srOnly}
  onchange={(event) => onChange?.(event)}
/>
<label class={cm.cn(cm.controlLabel, disabled && cm.controlDisabled)}>
  <button
    bind:this={ref}
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
    <PresentWhileContent tag="span" class={cm.controlText}
      >{#if typeof label === 'string'}{label}{:else}{@render label?.()}{/if}</PresentWhileContent
    >
  {/if}
</label>

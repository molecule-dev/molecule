<!--
  FloatingInput: an input with a floating label. Controlled when `value` is
  given; otherwise it tracks its own state seeded once from `defaultValue`.
  The input's value is applied the way react-dom applies it (property AND
  `value` attribute through `defaultValue`), so parity snapshots match.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { reactInputValue, spreadEvents, useGeneratedId } from '../dom.js'
  import type { FloatingInputProps } from '../types.js'

  let {
    placeholder,
    className,
    value: valueProp,
    onChange,
    defaultValue,
    id,
    ...props
  }: FloatingInputProps = $props()

  const cm = $derived(getClassMap())
  let internalValue = $state(untrack(() => String(defaultValue ?? '')))
  const isControlled = $derived(valueProp !== undefined)
  const value = $derived(isControlled ? String(valueProp ?? '') : internalValue)
  const generatedId = useGeneratedId()
  const inputId = $derived(id || generatedId)
  const valueProps = $derived({ value, defaultValue })

  const handleChange = (e: Event): void => {
    if (!isControlled) {
      internalValue = (e.target as HTMLInputElement).value
    }
    onChange?.(e)
    // A controlled value without a caller update keeps its prop value, exactly
    // like react-dom's controlled-input restore after the change event.
    if (isControlled && e.target instanceof HTMLInputElement) e.target.value = valueProp ?? ''
  }
</script>

<span class={cm.floatingInputWrapper}>
  <input
    id={inputId}
    {...reactAttrs(withoutEvents(props))}
    use:spreadEvents={props}
    {placeholder}
    class={cm.cn(cm.input(), cm.floatingInput, className)}
    use:reactInputValue={valueProps}
    oninput={handleChange}
  />
  {#if placeholder}
    <label for={inputId} class={cm.floatingLabel}>{placeholder}</label>
  {/if}
</span>

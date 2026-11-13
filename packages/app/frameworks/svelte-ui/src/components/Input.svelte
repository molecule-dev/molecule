<!--
  Input: label + adornments + error/hint wiring. Falls back to a generated id
  so htmlFor / aria-describedby never dangle; aria-invalid always reflects the
  error state; autoFocus focuses once on mount like React's autoFocus.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { reactInputValue, spreadEvents, useGeneratedId } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { InputProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'

  let {
    type = 'text',
    size = 'md',
    align,
    label,
    error,
    hint,
    leftElement,
    rightElement,
    clearable,
    onClear,
    clearLabel,
    className,
    style,
    testId,
    disabled,
    required,
    value,
    defaultValue,
    placeholder,
    name,
    id,
    onChange,
    onFocus,
    onBlur,
    autoFocus,
    ...rest
  }: InputProps = $props()

  const generatedId = useGeneratedId()
  const inputId = $derived(id || name || generatedId)

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const inputClasses = $derived(
    cm.cn(
      cm.input({ error: !!error, size, align }),
      !!leftElement && cm.inputPadLeft,
      !!(rightElement || clearable) && cm.inputPadRight,
      className,
    ),
  )
  const valueProps = $derived({ value, defaultValue })

  let inputEl = $state<HTMLInputElement | null>(null)

  $effect(() => {
    if (autoFocus) {
      const el = document.getElementById(inputId)
      if (el instanceof HTMLInputElement) el.focus()
    }
  })

  const handleInput = (e: Event): void => {
    onChange?.(e)
    // A controlled value without a caller update keeps its prop value, exactly
    // like React's controlled-input restore.
    if (value !== undefined && inputEl) inputEl.value = value
  }
</script>

<div class={cm.inputWrapper}>
  {#if label}
    <label for={inputId} class={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
      >{label}</label
    >
  {/if}
  <div class={cm.inputInner}>
    {#if leftElement}<div class={cm.inputLeftElement}>{@render leftElement()}</div>{/if}
    <input
      bind:this={inputEl}
      {type}
      id={inputId}
      {name}
      use:reactInputValue={valueProps}
      {placeholder}
      {disabled}
      {required}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
      class={inputClasses}
      use:reactStyle={style}
      data-testid={testId}
      oninput={handleInput}
      onfocusin={onFocus}
      onfocusout={onBlur}
      {...reactAttrs(withoutEvents(rest))}
      use:spreadEvents={rest}
    />
    {#if rightElement || (clearable && value)}
      <div class={cm.inputRightElement}>
        {#if clearable && value}
          <button
            type="button"
            onclick={onClear}
            class={cm.inputClearButton}
            aria-label={clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' })}
          >
            <IconGlyph name="x-mark" className={cm.iconSm} />
          </button>
        {:else}
          <span class={cm.textMuted}>{@render rightElement?.()}</span>
        {/if}
      </div>
    {/if}
  </div>
  {#if error}
    <p id={`${inputId}-error`} class={cm.formError}>{error}</p>
  {/if}
  {#if hint && !error}
    <p id={`${inputId}-hint`} class={cm.formHint}>{hint}</p>
  {/if}
</div>

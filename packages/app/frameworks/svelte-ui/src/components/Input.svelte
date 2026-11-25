<!--
  Input: label + adornments + error/hint wiring. Falls back to a generated id
  so htmlFor / aria-describedby never dangle; aria-invalid always reflects the
  error state; autoFocus focuses once on mount like React's autoFocus.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { fieldLayout, getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { contentPresence } from '../content-presence.js'
  import { reactInputValue, spreadEvents, useGeneratedId } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { InputProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'

  let {
    ref = $bindable(null),
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
  // A column around the label, the control's row and the message, so the control's margin
  // moves the control on every renderer (the same layout in every framework's kit).
  const field = $derived(fieldLayout(cm))
  // An adornment that renders nothing (React's `slot(leftElement)`) takes no
  // padding and no wrapper, so the padding follows the rendered wrappers.
  let hasLeft = $state(false)
  let hasRight = $state(false)
  const reportLeft = (renders: boolean): void => {
    hasLeft = renders
  }
  const reportRight = (renders: boolean): void => {
    hasRight = renders
  }
  const leftPresence = contentPresence(reportLeft, {
    renders: (element) => !!element.querySelector('input')?.previousElementSibling,
  })
  const rightPresence = contentPresence(reportRight, {
    renders: (element) => !!element.querySelector('input')?.nextElementSibling,
  })
  const inputClasses = $derived(
    cm.cn(
      cm.input({ error: !!error, size, align }),
      hasLeft && cm.inputPadLeft,
      (clearable || hasRight) && cm.inputPadRight,
      className,
    ),
  )
  const valueProps = $derived({ value, defaultValue })

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
    if (value !== undefined && ref) ref.value = value
  }
</script>

<div class={field.root}>
  {#if label}
    <label for={inputId} class={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
      >{label}</label
    >
  {/if}
  <div class={field.inner} {@attach leftPresence} {@attach rightPresence}>
    {#if leftElement}<PresentWhileContent class={cm.inputLeftElement}
        >{@render leftElement?.()}</PresentWhileContent
      >{/if}
    <input
      bind:this={ref}
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
      <PresentWhileContent class={cm.inputRightElement}>
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
          <PresentWhileContent tag="span" class={cm.textMuted}
            >{@render rightElement?.()}</PresentWhileContent
          >
        {/if}
      </PresentWhileContent>
    {/if}
  </div>
  {#if error}
    <p id={`${inputId}-error`} class={cm.formError}>{error}</p>
  {/if}
  {#if hint && !error}
    <p id={`${inputId}-hint`} class={cm.formHint}>{hint}</p>
  {/if}
</div>

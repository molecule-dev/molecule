<!--
  Textarea: label + error/hint + autoResize (controlled and uncontrolled —
  autoResize listens to real input events on the element).
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents, useGeneratedId } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { TextareaProps } from '../types.js'

  let {
    size,
    label,
    error,
    hint,
    autoResize,
    minRows = 3,
    maxRows,
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
    rows,
    onChange,
    onFocus,
    onBlur,
    ...rest
  }: TextareaProps = $props()

  const cm = $derived(getClassMap())
  const generatedId = useGeneratedId()
  const textareaId = $derived(id || name || generatedId)
  const textareaClasses = $derived(cm.cn(cm.textarea({ error: !!error, size }), className))

  let textareaEl = $state<HTMLTextAreaElement | null>(null)

  const resize = (): void => {
    const element = textareaEl
    if (!autoResize || !element) return
    element.style.height = 'auto'
    const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 20
    const minHeight = minRows * lineHeight
    const maxHeight = maxRows ? maxRows * lineHeight : Infinity
    const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
    element.style.height = `${newHeight}px`
  }

  // Controlled usage (value tracked by the caller) recomputes here.
  $effect(() => {
    void value
    resize()
  })

  // Uncontrolled usage catches real keystrokes through input events.
  $effect(() => {
    const element = textareaEl
    if (!autoResize || !element) return
    element.addEventListener('input', resize)
    return () => element.removeEventListener('input', resize)
  })

  const shownValue = $derived(value !== undefined ? value : (defaultValue ?? undefined))

  const handleChange = (e: Event): void => {
    onChange?.(e)
    // Controlled value without a caller update keeps its prop value.
    if (value !== undefined && textareaEl) textareaEl.value = value
  }
</script>

<div class={cm.inputWrapper}>
  {#if label}
    <label for={textareaId} class={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
      >{label}</label
    >
  {/if}
  <textarea
    bind:this={textareaEl}
    id={textareaId}
    {name}
    value={shownValue}
    {placeholder}
    {disabled}
    {required}
    rows={rows || minRows}
    aria-invalid={error ? 'true' : 'false'}
    aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
    class={textareaClasses}
    use:reactStyle={autoResize ? { minHeight: 0, resize: 'none', ...style } : style}
    data-testid={testId}
    oninput={handleChange}
    onfocusin={onFocus}
    onfocusout={onBlur}
    {...reactAttrs(withoutEvents(rest))}
    use:spreadEvents={rest}></textarea>
  {#if error}
    <p id={`${textareaId}-error`} class={cm.formError}>{error}</p>
  {/if}
  {#if hint && !error}
    <p id={`${textareaId}-hint`} class={cm.formHint}>{hint}</p>
  {/if}
</div>

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
    ref = $bindable(null),
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

  const resize = (): void => {
    const element = ref
    if (!autoResize || !element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }

  // Clear the previous measurement when the bounds change or growing stops.
  // Uncontrolled usage catches real keystrokes through input events.
  $effect(() => {
    void minRows
    void maxRows
    const element = ref
    if (!autoResize || !element) return
    element.addEventListener('input', resize)
    return () => {
      element.removeEventListener('input', resize)
      element.style.height = ''
    }
  })

  // Measure after the old height is cleared and the new rows and bounds are applied.
  $effect(() => {
    void value
    void minRows
    void maxRows
    resize()
  })

  const shownValue = $derived(value !== undefined ? value : (defaultValue ?? undefined))

  const handleChange = (e: Event): void => {
    onChange?.(e)
    // Controlled value without a caller update keeps its prop value.
    if (value !== undefined && ref) ref.value = value
  }
</script>

<div class={cm.inputWrapper}>
  {#if label}
    <label for={textareaId} class={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
      >{label}</label
    >
  {/if}
  <textarea
    bind:this={ref}
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
    use:reactStyle={autoResize
      ? {
          resize: 'none',
          ...style,
          minHeight: `${Math.min(minRows, maxRows ?? Infinity)}lh`,
          ...(maxRows === undefined ? {} : { maxHeight: `${maxRows}lh` }),
        }
      : style}
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

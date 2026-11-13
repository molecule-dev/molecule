<!--
  Select: a native select with label, placeholder/clear options, grouped
  options, a real inline chevron and error/hint wiring. onChange fires with
  the native change event; onValueChange receives the selected value.
-->
<script lang="ts">
  import { t } from '@molecule/app-i18n'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents, useGeneratedId } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { SelectProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'

  let {
    options,
    value,
    onValueChange,
    size = 'md',
    label,
    placeholder,
    error,
    hint,
    clearable,
    className,
    style,
    testId,
    disabled,
    required,
    name,
    id,
    onChange,
    ...rest
  }: SelectProps = $props()

  const cm = $derived(getClassMap())
  const generatedId = useGeneratedId()
  const selectId = $derived(id || name || generatedId)
  const selectClasses = $derived(
    cm.cn(cm.select({ error: !!error, size }), cm.selectNative, cm.inputPadRight, className),
  )
  const showClearOption = $derived(clearable && !placeholder)
  const groupedOptions = $derived.by(() => {
    return options.reduce<Record<string, typeof options>>((acc, option) => {
      const group = option.group || ''
      if (!acc[group]) acc[group] = []
      acc[group]!.push(option)
      return acc
    }, {})
  })

  let selectEl = $state<HTMLSelectElement | null>(null)

  // react-dom never assigns `select.value`; it marks the matching <option>'s
  // `selected` property (and, when nothing matches, the first non-disabled
  // option's), which is what a select with no explicit selection displays
  // anyway. Assigning `select.value` instead would deselect everything on a
  // value no option carries.
  const applyReactSelection = (): void => {
    if (!selectEl) return
    // Track the rendered option set reactively so re-renders that change it
    // re-mark the selection.
    void groupedOptions
    void placeholder
    void showClearOption
    const multiple = !!rest.multiple
    const nodes = Array.from(selectEl.options)
    if (multiple) {
      const values = Array.isArray(value) ? value.map(String) : []
      for (const option of nodes) option.selected = values.includes(option.value)
      return
    }
    if (value === undefined || value === null) return
    const text = String(value)
    let fallback: HTMLOptionElement | null = null
    for (const option of nodes) {
      if (option.value === text) {
        option.selected = true
        return
      }
      if (fallback === null && !option.disabled) fallback = option
    }
    if (fallback) fallback.selected = true
  }

  $effect(() => {
    if (value === undefined || value === null) return
    applyReactSelection()
  })

  const handleChange = (e: Event): void => {
    onChange?.(e)
    onValueChange?.((e.currentTarget as HTMLSelectElement).value)
    // A controlled select without a state update keeps its prop value, exactly
    // like react-dom's controlled-select restore after the change event.
    if (value !== undefined && value !== null) applyReactSelection()
  }
</script>

<div class={cm.inputWrapper}>
  {#if label}
    <label for={selectId} class={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
      >{label}</label
    >
  {/if}
  <div class={cm.inputInner}>
    <select
      bind:this={selectEl}
      id={selectId}
      {name}
      {disabled}
      {required}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
      class={selectClasses}
      use:reactStyle={style}
      data-testid={testId}
      onchange={handleChange}
      {...reactAttrs(withoutEvents(rest))}
      use:spreadEvents={rest}
    >
      {#if placeholder}<option value="" disabled>{placeholder}</option>{/if}
      {#if showClearOption}
        <option value="">{t('ui.select.clear', undefined, { defaultValue: '--' })}</option>
      {/if}
      {#each Object.entries(groupedOptions) as [group, groupOptions] (group)}
        {#if group === ''}
          {#each groupOptions as option (option.value)}
            <option value={option.value} disabled={option.disabled}>{option.label}</option>
          {/each}
        {:else}
          <optgroup label={group}>
            {#each groupOptions as option (option.value)}
              <option value={option.value} disabled={option.disabled}>{option.label}</option>
            {/each}
          </optgroup>
        {/if}
      {/each}
    </select>
    <div class={cm.inputRightElement} use:reactStyle={{ pointerEvents: 'none' }}>
      <IconGlyph name="chevron-down" className={cm.cn(cm.iconSm, cm.textMuted)} />
    </div>
  </div>
  {#if error}
    <p id={`${selectId}-error`} class={cm.formError}>{error}</p>
  {/if}
  {#if hint && !error}
    <p id={`${selectId}-hint`} class={cm.formHint}>{hint}</p>
  {/if}
</div>

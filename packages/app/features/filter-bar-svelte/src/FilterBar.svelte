<!--
  FilterBar: the Svelte counterpart of `@molecule/app-filter-bar-react`'s
  `FilterBar` — one control per field (text, select, multi, date-range), a full
  updated values map on every change, and an optional clear button. Same props
  (React names), same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Input, Select } from '@molecule/app-ui-svelte'

  import type { FilterBarProps, FilterField, FilterValues } from './types.js'

  let {
    fields,
    values,
    onChange,
    onClear,
    actions,
    showLabels = false,
    className,
  }: FilterBarProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /**
   * Updates a single field in the filter values and notifies the parent.
   *
   * @param id - The field id to update.
   * @param v - The field's new value.
   */
  function set(id: string, v: FilterValues[string]): void {
    onChange({ ...values, [id]: v })
  }

  /**
   * The text-like value of a field, as a string.
   *
   * @param f - The field definition.
   * @returns The field's current text value (empty when unset).
   */
  const textValue = (f: FilterField): string => (values[f.id] as string) ?? ''

  /**
   * The comma-joined value of a multi field.
   *
   * @param f - The field definition.
   * @returns The comma-joined values.
   */
  const multiValue = (f: FilterField): string =>
    ((values[f.id] as string[] | undefined) ?? []).join(', ')

  /**
   * The bounds of a date-range field.
   *
   * @param f - The field definition.
   * @returns The stored from/to bounds.
   */
  const rangeValue = (f: FilterField): { from?: string; to?: string } =>
    (values[f.id] as { from?: string; to?: string } | undefined) ?? {}

  /**
   * Splits a comma-separated text value into the multi field's array.
   *
   * @param value - The raw input text.
   * @returns The trimmed, non-empty entries.
   */
  const splitMulti = (value: string): string[] =>
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  /**
   * Calls `onClear` with the click event, the way React hands `onClick` the
   * event object.
   *
   * @param event - The click event.
   */
  function clearAll(event: MouseEvent): void {
    const notify: ((e: MouseEvent) => void) | undefined = onClear
    notify?.(event)
  }
</script>

{#snippet fieldControl(f: FilterField)}
  {#if f.type === 'text'}
    <Input
      type="text"
      value={textValue(f)}
      onChange={(e) => set(f.id, (e.target as HTMLInputElement).value)}
      placeholder={f.placeholder ?? f.label}
      aria-label={f.label}
    />
  {:else if f.type === 'select'}
    <Select
      value={textValue(f)}
      onValueChange={(v) => set(f.id, v)}
      options={f.options}
      aria-label={f.label}
    />
  {:else if f.type === 'multi'}
    <Input
      type="text"
      value={multiValue(f)}
      onChange={(e) => set(f.id, splitMulti((e.target as HTMLInputElement).value))}
      placeholder={f.placeholder ?? f.label}
      aria-label={f.label}
    />
  {:else}
    <span class={cm.flex({ align: 'center', gap: 'xs' })}>
      <Input
        type="date"
        value={rangeValue(f).from ?? ''}
        onChange={(e) =>
          set(f.id, { ...rangeValue(f), from: (e.target as HTMLInputElement).value })}
        aria-label={t('filterBar.from', { label: f.label }, { defaultValue: '{{label}} from' })}
      />
      <span>–</span>
      <Input
        type="date"
        value={rangeValue(f).to ?? ''}
        onChange={(e) => set(f.id, { ...rangeValue(f), to: (e.target as HTMLInputElement).value })}
        aria-label={t('filterBar.to', { label: f.label }, { defaultValue: '{{label}} to' })}
      />
    </span>
  {/if}
{/snippet}

<div
  class={cm.cn(
    cm.flex({ align: showLabels ? 'end' : 'center', gap: 'sm', wrap: 'wrap' }),
    className,
  )}
>
  {#each fields as f (f.id)}
    {#if showLabels}
      <label class={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span
          class={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.uppercase,
            cm.trackingWide,
            cm.textMuted,
          )}
        >
          {f.label}
        </span>
        {@render fieldControl(f)}
      </label>
    {:else}
      {@render fieldControl(f)}
    {/if}
  {/each}
  {#if onClear}
    <Button variant="ghost" size="sm" onClick={clearAll}>
      {t('filterBar.clear', {}, { defaultValue: 'Clear filters' })}
    </Button>
  {/if}
  {#if actions}{@render actions()}{/if}
</div>

/**
 * Solid filter bar: one control per field (text, select, multi, date-range),
 * a full updated values map on every change, and an optional clear button.
 *
 * Solid counterpart of `@molecule/app-filter-bar-react`'s `FilterBar` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select } from '@molecule/app-ui-solid'

import type { FilterBarProps, FilterField, FilterValues } from './types.js'

/**
 * Data-driven filter bar. Renders one control per field in `fields`,
 * emits a full updated values map on each change so parents can store
 * filters in URL params, zustand, etc. Multi-select uses a comma-joined
 * `<Input>` fallback since multi-select UI isn't in the primitives yet.
 *
 * @param props - Component props (see {@link FilterBarProps}).
 * @returns The rendered filter bar.
 */
export const FilterBar: Component<FilterBarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /**
   * Updates a single field in the filter values and notifies the parent.
   *
   * @param id - The field id to update.
   * @param v - The field's new value.
   */
  const set = (id: string, v: FilterValues[string]): void => {
    props.onChange({ ...props.values, [id]: v })
  }

  /**
   * Renders one field's control, wrapped in an optional 10px-uppercase label
   * above (when `showLabels` is true). Both branches are lazy, so only the
   * rendered one creates the control.
   *
   * @param f - The field definition.
   * @returns The control, labeled or bare.
   */
  const labeledField = (f: FilterField): JSX.Element => (
    <Show when={props.showLabels} fallback={fieldNode(f)}>
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
        {fieldNode(f)}
      </label>
    </Show>
  )

  /**
   * Renders one field's control.
   *
   * @param f - The field definition.
   * @returns The control JSX.
   */
  const fieldNode = (f: FilterField): JSX.Element => {
    if (f.type === 'text') {
      return (
        <Input
          type="text"
          value={(props.values[f.id] as string) ?? ''}
          onChange={(e) => set(f.id, (e.target as HTMLInputElement).value)}
          placeholder={f.placeholder ?? f.label}
          aria-label={f.label}
        />
      )
    }
    if (f.type === 'select') {
      return (
        <Select
          value={(props.values[f.id] as string) ?? ''}
          onValueChange={(v) => set(f.id, v)}
          options={f.options}
          aria-label={f.label}
        />
      )
    }
    if (f.type === 'multi') {
      const current = (): string[] => (props.values[f.id] as string[] | undefined) ?? []
      return (
        <Input
          type="text"
          value={current().join(', ')}
          onChange={(e) =>
            set(
              f.id,
              (e.target as HTMLInputElement).value
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder={f.placeholder ?? f.label}
          aria-label={f.label}
        />
      )
    }
    // date-range
    const range = (): { from?: string; to?: string } =>
      (props.values[f.id] as { from?: string; to?: string } | undefined) ?? {}
    return (
      <span class={cm.flex({ align: 'center', gap: 'xs' })}>
        <Input
          type="date"
          value={range().from ?? ''}
          onChange={(e) => set(f.id, { ...range(), from: (e.target as HTMLInputElement).value })}
          aria-label={t('filterBar.from', { label: f.label }, { defaultValue: '{{label}} from' })}
        />
        <span>–</span>
        <Input
          type="date"
          value={range().to ?? ''}
          onChange={(e) => set(f.id, { ...range(), to: (e.target as HTMLInputElement).value })}
          aria-label={t('filterBar.to', { label: f.label }, { defaultValue: '{{label}} to' })}
        />
      </span>
    )
  }

  /**
   * Calls `onClear` with the click event, the way React hands `onClick` the
   * event object.
   *
   * @param event - The click event.
   */
  const clearAll = (event: MouseEvent): void => {
    const notify: ((e: MouseEvent) => void) | undefined = props.onClear
    notify?.(event)
  }

  return (
    <div
      class={cm.cn(
        cm.flex({ align: props.showLabels ? 'end' : 'center', gap: 'sm', wrap: 'wrap' }),
        props.className,
      )}
    >
      <For each={props.fields}>{(f) => labeledField(f)}</For>
      <Show when={props.onClear}>
        <Button variant="ghost" size="sm" onClick={clearAll}>
          {t('filterBar.clear', {}, { defaultValue: 'Clear filters' })}
        </Button>
      </Show>
      {props.actions}
    </div>
  )
}

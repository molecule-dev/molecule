/**
 * Vue filter bar: one control per field (text, select, multi, date-range), a
 * full values map on every change, and an optional clear button.
 *
 * Vue counterpart of `@molecule/app-filter-bar-react`'s `FilterBar` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { FilterBarProps, FilterField, FilterValues } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * prop when given, otherwise the slot, otherwise nothing.
 *
 * @param value - The prop's value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @returns The children to render.
 */
const nodeOrSlot = (
  value: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (value !== undefined && value !== null && value !== false) {
    return Array.isArray(value) ? value : [value]
  }
  if (slot) return slot()
  return []
}

/**
 * Data-driven filter bar. Renders one control per field in `fields`,
 * emits a full updated values map on each change so parents can store
 * filters in URL params, zustand, etc. Multi-select uses a comma-joined
 * `<Input>` fallback since multi-select UI isn't in the primitives yet.
 *
 * @param props - Component props (see {@link FilterBarProps}).
 * @returns The filter bar component.
 */
export const FilterBar = defineComponent({
  name: 'FilterBar',
  props: {
    fields: {
      type: Array as PropType<FilterField[]>,
      required: true,
    },
    values: {
      type: Object as PropType<FilterValues>,
      required: true,
    },
    onChange: {
      type: Function as PropType<FilterBarProps['onChange']>,
      required: true,
    },
    onClear: {
      type: Function as PropType<FilterBarProps['onClear']>,
    },
    // Node-valued prop: declared with `null` (any runtime type, no validation
    // — a VNode, a string, or `null` to render nothing).
    actions: null,
    showLabels: {
      type: Boolean,
      default: false,
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * Updates a single field in the filter values and notifies the parent.
     *
     * @param id - The field id to update.
     * @param v - The field's new value.
     */
    function set(id: string, v: FilterValues[string]): void {
      props.onChange?.({ ...props.values, [id]: v })
    }

    /**
     * Wrap a field's input(s) with an optional 10px-uppercase label above
     * (when `showLabels` is true).
     *
     * @param field - The field being wrapped.
     * @param children - The field's control.
     * @returns The control, labeled or bare.
     */
    function withLabel(field: FilterField, children: VNodeChild): VNodeChild {
      if (!props.showLabels) return children
      return h(
        'label',
        { key: `${field.id}-label`, class: cm.cn(cm.flex({ direction: 'col', gap: 'xs' })) },
        [
          h(
            'span',
            {
              class: cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.uppercase,
                cm.trackingWide,
                cm.textMuted,
              ),
            },
            field.label,
          ),
          children,
        ],
      )
    }

    /**
     * Renders one field's control.
     *
     * @param f - The field definition.
     * @returns The control node.
     */
    function fieldNode(f: FilterField): VNodeChild {
      if (f.type === 'text') {
        return h(Input, {
          key: f.id,
          type: 'text',
          value: (props.values[f.id] as string) ?? '',
          onChange: (e: Event) => set(f.id, (e.target as HTMLInputElement).value),
          placeholder: f.placeholder ?? f.label,
          'aria-label': f.label,
        })
      }
      if (f.type === 'select') {
        return h(Select, {
          key: f.id,
          value: (props.values[f.id] as string) ?? '',
          onValueChange: (v: string) => set(f.id, v),
          options: f.options,
          'aria-label': f.label,
        })
      }
      if (f.type === 'multi') {
        const current = (props.values[f.id] as string[] | undefined) ?? []
        return h(Input, {
          key: f.id,
          type: 'text',
          value: current.join(', '),
          onChange: (e: Event) =>
            set(
              f.id,
              (e.target as HTMLInputElement).value
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean),
            ),
          placeholder: f.placeholder ?? f.label,
          'aria-label': f.label,
        })
      }
      // date-range
      const range = (props.values[f.id] as { from?: string; to?: string } | undefined) ?? {}
      return h('span', { key: f.id, class: cm.flex({ align: 'center', gap: 'xs' }) }, [
        h(Input, {
          type: 'date',
          value: range.from ?? '',
          onChange: (e: Event) =>
            set(f.id, { ...range, from: (e.target as HTMLInputElement).value }),
          'aria-label': t('filterBar.from', { label: f.label }, { defaultValue: '{{label}} from' }),
        }),
        h('span', {}, '–'),
        h(Input, {
          type: 'date',
          value: range.to ?? '',
          onChange: (e: Event) => set(f.id, { ...range, to: (e.target as HTMLInputElement).value }),
          'aria-label': t('filterBar.to', { label: f.label }, { defaultValue: '{{label}} to' }),
        }),
      ])
    }

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({
              align: props.showLabels ? 'end' : 'center',
              gap: 'sm',
              wrap: 'wrap',
            }),
            props.className,
          ),
        },
        [
          ...props.fields.map((f) => withLabel(f, fieldNode(f))),
          ...(props.onClear
            ? [
                h(
                  Button,
                  {
                    variant: 'ghost',
                    size: 'sm',
                    onClick: (event: MouseEvent) => {
                      // React hands `onClear` the click event; forward it so the
                      // call (and its recorded arguments) is the same.
                      const notify: ((e: MouseEvent) => void) | undefined = props.onClear
                      notify?.(event)
                    },
                  },
                  () => t('filterBar.clear', {}, { defaultValue: 'Clear filters' }),
                ),
              ]
            : []),
          ...nodeOrSlot(props.actions, slots.actions),
        ],
      )
  },
})

/**
 * Vue Select UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  type PropType,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { t } from '@molecule/app-i18n'
import type { SelectOption, SelectProps, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { renderIcon } from '../utilities/renderIcon.js'

/** Source of the generated per-instance select ids. */
let nextGeneratedId = 1

/**
 * Vue Select UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Select: a `cm.inputWrapper` root
 * with an optional label, a native `<select>` (placeholder, clearable
 * "no selection" option, flat and `optgroup`-grouped options), a decorative
 * chevron overlay and error/hint lines. The `value` prop behaves like React's
 * controlled `value`: the selection moves only when a re-render moves the
 * prop, while `defaultValue` (passed through like React's rest spread) selects
 * its option initially and then leaves the selection to the user.
 */
export const Select = defineComponent({
  name: 'MSelect',
  inheritAttrs: false,
  props: {
    options: {
      type: Array as PropType<SelectOption<string>[]>,
      required: true,
    },
    value: String,
    size: {
      type: String as PropType<Size>,
      default: 'md',
    },
    label: String,
    placeholder: String,
    error: String,
    hint: String,
    clearable: {
      type: Boolean,
      default: false,
    },
    className: String,
    style: [String, Object] as PropType<SelectProps['style']>,
    testId: String,
    disabled: {
      type: Boolean,
      default: false,
    },
    required: {
      type: Boolean,
      default: false,
    },
    name: String,
    id: String,
  },
  emits: ['change', 'valueChange'],
  setup(props, { attrs, emit }) {
    const cm = getClassMap()
    // Fall back to a generated id so label htmlFor / aria-describedby never
    // point at `undefined-error` (which also collides across multiple
    // id-less selects on the same page).
    const selectId = props.id || props.name || `mol-select-${nextGeneratedId++}`
    const errorId = `${selectId}-error`
    const hintId = `${selectId}-hint`

    let selectEl: HTMLSelectElement | null = null
    const setSelectEl = (el: unknown): void => {
      selectEl = (el as HTMLSelectElement) ?? null
    }

    // React DOM syncs a controlled <select> after every commit
    // (`updateOptions`): the matching <option> gets its live `selected`
    // PROPERTY set — never the attribute, and never deselecting the rest —
    // so a value that matches no option leaves the browser's own
    // first-option default in place. Setting `select.value` instead would
    // clear selectedness entirely (an empty value where React shows the
    // first option).
    const syncSelected = (): void => {
      const select = selectEl
      if (!select || props.value === undefined) return
      for (const option of select.options) {
        if (option.value === props.value) {
          option.selected = true
          return
        }
      }
    }
    onMounted(syncSelected)
    watch([() => props.value, () => props.options], syncSelected, { flush: 'post' })

    const handleChange = (event: Event): void => {
      emit('change', event)
      emit('valueChange', (event.target as HTMLSelectElement).value)
      // Controlled restore: React re-applies the rendered `value` prop right
      // after the change event, so the selection only moves when a re-render
      // moves the prop.
      if (props.value !== undefined) {
        ;(event.target as HTMLSelectElement).value = props.value
      }
    }

    return () => {
      const selectClasses = cm.cn(
        cm.select({ error: !!props.error, size: props.size }),
        cm.selectNative,
        cm.inputPadRight,
        ...classOf(props.className, attrs),
      )

      // The clearable "no selection" option shares value="" with the
      // placeholder option — rendering both produced two <option value="">
      // entries in the same <select>. Suppress the redundant one; the
      // placeholder already serves as the clear target.
      const showClearOption = props.clearable && !props.placeholder

      // React's `...rest` spread, minus `defaultValue`: React DOM consumes it
      // as the UNCONTROLLED initial value (it renders `selected` on the
      // matching <option>); spreading it raw would paint a `defaultValue`
      // attribute the React DOM never renders.
      const { defaultValue, ...rest } = restAttrs(attrs)
      // Controlled when React's `value` prop is present; otherwise
      // `defaultValue` picks its option via the `selected` attribute.
      const uncontrolledDefault =
        props.value === undefined && defaultValue !== undefined && defaultValue !== null
          ? String(defaultValue)
          : undefined

      // Group options by group property
      const groupedOptions = props.options.reduce<Record<string, SelectOption<string>[]>>(
        (acc, option) => {
          const group = option.group || ''
          if (!acc[group]) {
            acc[group] = []
          }
          acc[group].push(option)
          return acc
        },
        {},
      )

      const renderOption = (option: SelectOption<string>): VNode =>
        h(
          'option',
          {
            key: option.value,
            value: option.value,
            disabled: option.disabled,
            ...(uncontrolledDefault !== undefined
              ? { selected: option.value === uncontrolledDefault }
              : {}),
          },
          option.label,
        )

      const renderOptions = (): VNodeChild[] => {
        const groups = Object.entries(groupedOptions)

        if (groups.length === 1 && groups[0][0] === '') {
          // No groups, render flat options
          return groups[0][1].map(renderOption)
        }

        // Render grouped options; ungrouped ones stay flat siblings of the
        // `<optgroup>`s (Vue flattens the nested arrays, as React's JSX does).
        return groups.map(([group, groupOptions]) => {
          if (group === '') {
            return groupOptions.map(renderOption)
          }

          return h('optgroup', { key: group, label: group }, groupOptions.map(renderOption))
        })
      }

      const selectChildren: VNodeChild[] = []
      if (props.placeholder) {
        selectChildren.push(h('option', { value: '', disabled: true }, props.placeholder))
      }
      if (showClearOption) {
        selectChildren.push(
          h('option', { value: '' }, t('ui.select.clear', undefined, { defaultValue: '--' })),
        )
      }
      selectChildren.push(...renderOptions())

      return h('div', { class: cm.inputWrapper }, [
        props.label &&
          h(
            'label',
            {
              for: selectId,
              class: cm.cn(cm.label({ required: !!props.required }), cm.labelBlock),
            },
            props.label,
          ),
        h('div', { class: cm.inputInner }, [
          h(
            'select',
            {
              id: selectId,
              name: props.name,
              disabled: props.disabled,
              required: props.required,
              'aria-invalid': !!props.error,
              'aria-describedby': props.error ? errorId : props.hint ? hintId : undefined,
              class: selectClasses,
              style: styleOf(props.style, attrs),
              'data-testid': props.testId,
              ref: setSelectEl,
              onChange: handleChange,
              ...rest,
            },
            selectChildren,
          ),
          // The chevron is a real inline SVG (see React's Select) so it
          // resolves `currentColor` from `cm.textMuted` and tracks the active
          // theme. `pointerEvents: 'none'` is inline because it fills a gap
          // ClassMap's `inputRightElement` doesn't address — without it this
          // purely decorative, absolutely-positioned overlay would swallow
          // clicks on the select's own chevron-sized hit area.
          h('div', { class: cm.inputRightElement, style: { pointerEvents: 'none' } }, [
            renderIcon('chevron-down', cm.cn(cm.iconSm, cm.textMuted)),
          ]),
        ]),
        props.error && h('p', { id: errorId, class: cm.formError }, props.error),
        props.hint && !props.error && h('p', { id: hintId, class: cm.formHint }, props.hint),
      ])
    }
  },
})

/**
 * Vue Switch UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type PropType,
  type Ref,
  ref,
  type VNodeChild,
  watch,
} from 'vue'

import type { SwitchProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { toChildArray } from '@molecule/app-vue'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { mountChecked, updateChecked } from '../utilities/checked.js'
import { useElementRef } from '../utilities/elementRef.js'
import { setDisplayName } from './displayName.js'

/**
 * Vue Switch UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Switch: a hidden, real native
 * checkbox mirrors `checked` and the visible `button[role="switch"]` clicks
 * it, so `onChange` receives a genuine browser `change` event whose
 * `target.checked` is real. A caller's `onClick` runs first and can veto the
 * toggle with `preventDefault()`.
 */
export const Switch = defineComponent({
  name: 'MSwitch',
  inheritAttrs: false,
  props: {
    label: null,
    checked: {
      type: Boolean,
      default: undefined,
    },
    size: {
      type: String as PropType<SwitchProps['size']>,
      default: 'md',
    },
    color: String as PropType<SwitchProps['color']>,
    className: String,
    style: [String, Object] as PropType<SwitchProps['style']>,
    testId: String,
    name: String,
    value: [String, Number, Array],
    required: Boolean,
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: { change: null, click: null, checkedChange: (_checked: boolean) => true },
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    // The visible `role="switch"` button is React's `forwardRef` target; the
    // hidden native checkbox below keeps its own ref.
    const element = useElementRef<HTMLButtonElement>(expose)

    // A hidden, real native checkbox mirrors `checked` — `handleClick`
    // below calls `.click()` on it instead of forging a fake event object.
    // Its `change` is a GENUINE browser Event, so
    // `event.preventDefault()`/`event.stopPropagation()` are real methods
    // and `event.target`/`currentTarget` resolve to a real element with a
    // real `.checked`. Kept as a SIBLING of the visible <label> (not a
    // descendant of it) — both the checkbox and the <button> are "labelable"
    // elements per the HTML spec, so nesting both inside one <label> risks
    // the browser's native label-click-forwarding firing a SECOND, redundant
    // click on whichever one isn't the direct target.
    const hiddenInputRef: Ref<HTMLInputElement | null> = ref(null)

    // React's controlled hidden checkbox: the attribute is written when the
    // input is created, the property on every commit (see `mountChecked`).
    // Attached ONCE, at mount, reading the current listeners through the
    // stable `emit`. React attaches the native `change` listener in a layout
    // effect — before the browser can deliver a click.
    const onHiddenChange = (event: Event): void => {
      const next = hiddenInputRef.value?.checked
      emit('change', event)
      if (next !== undefined) emit('checkedChange', next)
    }
    onMounted(() => {
      const input = hiddenInputRef.value
      if (!input) return
      mountChecked(input, !!props.checked)
      input.addEventListener('change', onHiddenChange)
    })
    onUnmounted(() => {
      const input = hiddenInputRef.value
      if (input) input.removeEventListener('change', onHiddenChange)
    })
    watch(
      () => props.checked,
      () => {
        if (hiddenInputRef.value) updateChecked(hiddenInputRef.value, !!props.checked)
      },
    )

    // A caller's onClick runs first and can veto the toggle with
    // preventDefault(); it used to be spread over this handler, so passing
    // one silently disabled the switch.
    const vetoed = (event: MouseEvent): boolean => props.disabled || event.defaultPrevented
    const handleClick = (event: MouseEvent): void => {
      emit('click', event)
      const input = hiddenInputRef.value
      if (!vetoed(event) && input) {
        input.click()
        // React restores the controlled hidden checkbox right after the
        // change its click fires (the caller's onChange ran during it).
        input.checked = !!props.checked
      }
    }

    return () => {
      const state = props.checked ? 'checked' : 'unchecked'
      // The label is node-valued (React: `{label as React.ReactNode}`); the
      // prop arrives as a VNode, or as the same-named slot.
      const labelNode = (props.label ?? slots.label?.()) as VNodeChild | undefined
      const label = toChildArray(labelNode).length > 0 ? labelNode : undefined

      const children = [
        h('input', {
          ref: hiddenInputRef,
          type: 'checkbox',
          name: props.name,
          value: props.value === undefined ? undefined : String(props.value),
          required: props.required || undefined,
          disabled: props.disabled,
          'aria-hidden': 'true',
          tabIndex: -1,
          class: cm.srOnly,
        }),
        h('label', { class: cm.cn(cm.controlLabel, props.disabled && cm.controlDisabled) }, [
          h(
            'button',
            {
              ref: element,
              type: 'button',
              role: 'switch',
              // `role="switch"` REQUIRES aria-checked; coerce so an
              // undefined/uncontrolled `checked` still announces "off"
              // instead of omitting the attribute (invalid ARIA, state
              // unreadable).
              'aria-checked': !!props.checked,
              disabled: props.disabled,
              'data-state': state,
              onClick: handleClick,
              class: cm.cn(
                cm.switchBase({ size: props.size, color: props.color }),
                ...classOf(props.className, attrs),
              ),
              style: styleOf(props.style, attrs),
              'data-testid': props.testId,
              ...restAttrs(attrs),
            },
            [h('span', { 'data-state': state, class: cm.switchThumb({ size: props.size }) })],
          ),
          !!label && h('span', { class: cm.controlText }, [label]),
        ]),
      ]
      return children
    }
  },
})

setDisplayName(Switch, 'Switch')

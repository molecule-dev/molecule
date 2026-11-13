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

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'

/** React's DOM-callback names that alias a differently spelled native event. */
const REACT_EVENT_ALIASES: Record<string, string> = {
  onDoubleClick: 'onDblclick',
}

/**
 * React forwards DOM callbacks in `...rest` verbatim (`onKeyDown`, …). Vue
 * only attaches a native listener for `on` + the DOM event name (`onKeydown`)
 * — it hyphenates anything after `on`, so React's camelCase spelling would
 * listen for an event nothing dispatches. Rewrites rest keys to the native
 * spelling: `on` + the lowercased DOM event name.
 *
 * @param attrs - The fallthrough attributes to spread onto a native element.
 * @returns The same attributes with event keys in Vue's native spelling.
 */
function nativeEventAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    out[
      REACT_EVENT_ALIASES[key] ?? (/^on[A-Z]/.test(key) ? `on${key.slice(2).toLowerCase()}` : key)
    ] = value
  }
  return out
}

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
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['change', 'click'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()

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

    // React syncs its controlled hidden checkbox on every commit; the
    // property AND the boolean `checked` attribute both follow the prop.
    const syncHiddenChecked = (): void => {
      const input = hiddenInputRef.value
      if (!input) return
      input.checked = !!props.checked
      if (props.checked) input.setAttribute('checked', '')
      else input.removeAttribute('checked')
    }

    // Attached ONCE, at mount, reading the current listeners through the
    // stable `emit`. React attaches the native `change` listener in a layout
    // effect — before the browser can deliver a click.
    const onHiddenChange = (event: Event): void => emit('change', event)
    onMounted(() => {
      const input = hiddenInputRef.value
      if (!input) return
      syncHiddenChecked()
      input.addEventListener('change', onHiddenChange)
    })
    onUnmounted(() => {
      const input = hiddenInputRef.value
      if (input) input.removeEventListener('change', onHiddenChange)
    })
    watch(() => props.checked, syncHiddenChecked)

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
      const label = (props.label ?? slots.label?.()) as VNodeChild | undefined

      const children = [
        h('input', {
          ref: hiddenInputRef,
          type: 'checkbox',
          disabled: props.disabled,
          'aria-hidden': 'true',
          tabIndex: -1,
          class: cm.srOnly,
        }),
        h('label', { class: cm.cn(cm.controlLabel, props.disabled && cm.controlDisabled) }, [
          h(
            'button',
            {
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
              ...nativeEventAttrs(restAttrs(attrs)),
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

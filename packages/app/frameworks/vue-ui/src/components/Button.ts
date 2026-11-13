/**
 * Vue Button UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { ButtonProps, ButtonSize, ButtonVariant, ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { Spinner } from './Spinner.js'

/**
 * Vue Button UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Button. While `loading` is
 * true, the native button is disabled and marked busy.
 */
export const Button = defineComponent({
  name: 'MButton',
  inheritAttrs: false,
  props: {
    variant: {
      type: String as PropType<ButtonVariant>,
      default: 'solid',
    },
    color: {
      type: String as PropType<ColorVariant>,
      default: 'primary',
    },
    size: {
      type: String as PropType<ButtonSize>,
      default: 'md',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    loadingText: String,
    fullWidth: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String as PropType<'button' | 'submit' | 'reset'>,
      default: 'button',
    },
    leftIcon: null,
    rightIcon: null,
    className: String,
    style: [String, Object] as PropType<ButtonProps['style']>,
    testId: String,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()

    return () => {
      const classes = cm.cn(
        cm.button({
          variant: props.variant,
          color: props.color,
          size: props.size,
          fullWidth: props.fullWidth,
        }),
        ...classOf(props.className, attrs),
      )

      const leftIcon = props.leftIcon ?? slots.leftIcon?.()
      const rightIcon = props.rightIcon ?? slots.rightIcon?.()

      const children: VNodeChild[] = []
      if (props.loading) children.push(h(Spinner, { size: 'sm', className: cm.buttonIconLeft }))
      if (!props.loading && !!leftIcon)
        children.push(h('span', { class: cm.buttonIconLeft }, [leftIcon]))
      const label = props.loading && props.loadingText ? props.loadingText : slots.default?.()
      if (label !== undefined) children.push(label)
      if (!props.loading && !!rightIcon)
        children.push(h('span', { class: cm.buttonIconRight }, [rightIcon]))

      return h(
        'button',
        {
          type: props.type,
          class: classes,
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          disabled: props.disabled || props.loading,
          'aria-busy': props.loading,
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        children,
      )
    }
  },
})

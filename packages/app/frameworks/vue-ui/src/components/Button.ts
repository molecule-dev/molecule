/**
 * Vue Button UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { ButtonVariant, ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Spinner } from './Spinner.js'

/**
 * Vue Button UI component with UIClassMap-driven styling.
 */
export const Button = defineComponent({
  name: 'MButton',
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
      type: String as PropType<Size>,
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
    class: String,
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    const cm = getClassMap()

    return () => {
      const classes = cm.cn(
        cm.button({
          variant: props.variant,
          color: props.color,
          size: props.size,
          fullWidth: props.fullWidth,
        }),
        props.class,
      )

      return h(
        'button',
        {
          type: props.type,
          class: classes,
          disabled: props.disabled || props.loading,
          'aria-busy': props.loading,
          onClick: (e: MouseEvent) => emit('click', e),
        },
        [
          props.loading && h(Spinner, { size: 'sm', class: cm.buttonIconLeft }),
          props.loading && props.loadingText ? props.loadingText : slots.default?.(),
        ],
      )
    }
  },
})

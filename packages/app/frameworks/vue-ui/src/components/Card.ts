/**
 * Vue Card UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

/**
 * Vue Card UI component with UIClassMap-driven styling.
 */
export const Card = defineComponent({
  name: 'MCard',
  props: {
    variant: {
      type: String as PropType<'elevated' | 'outlined' | 'filled'>,
      default: 'elevated',
    },
    padding: {
      type: String as PropType<Size | 'none'>,
      default: 'md',
    },
    interactive: Boolean,
    class: String,
  },
  emits: ['click'],
  setup(props, { emit, slots }) {
    const cm = getClassMap()

    return () => {
      const cmVariant = variantMap[props.variant] || 'default'
      const paddingClass = props.padding === 'none' ? '' : cm.cardPadding(props.padding)

      const cardClasses = cm.cn(
        cm.card({ variant: cmVariant }),
        paddingClass,
        props.interactive && cm.cardInteractive,
        props.class,
      )

      return h(
        'div',
        {
          class: cardClasses,
          role: props.interactive ? 'button' : undefined,
          tabindex: props.interactive ? 0 : undefined,
          onClick: (e: MouseEvent) => emit('click', e),
        },
        slots.default?.(),
      )
    }
  },
})

/**
 * CardHeader component.
 */
export const CardHeader = defineComponent({
  name: 'MCardHeader',
  props: { class: String },
  setup(props, { slots }) {
    const cm = getClassMap()
    return () => h('div', { class: cm.cn(cm.cardHeader, props.class) }, slots.default?.())
  },
})

/**
 * CardTitle component.
 */
export const CardTitle = defineComponent({
  name: 'MCardTitle',
  props: { class: String },
  setup(props, { slots }) {
    const cm = getClassMap()
    return () => h('h3', { class: cm.cn(cm.cardTitle, props.class) }, slots.default?.())
  },
})

/**
 * CardDescription component.
 */
export const CardDescription = defineComponent({
  name: 'MCardDescription',
  props: { class: String },
  setup(props, { slots }) {
    const cm = getClassMap()
    return () => h('p', { class: cm.cn(cm.cardDescription, props.class) }, slots.default?.())
  },
})

/**
 * CardContent component.
 */
export const CardContent = defineComponent({
  name: 'MCardContent',
  props: { class: String },
  setup(props, { slots }) {
    const cm = getClassMap()
    return () => h('div', { class: cm.cn(cm.cardContent, props.class) }, slots.default?.())
  },
})

/**
 * CardFooter component.
 */
export const CardFooter = defineComponent({
  name: 'MCardFooter',
  props: { class: String },
  setup(props, { slots }) {
    const cm = getClassMap()
    return () => h('div', { class: cm.cn(cm.cardFooter, props.class) }, slots.default?.())
  },
})

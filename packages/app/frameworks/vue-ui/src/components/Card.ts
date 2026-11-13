/**
 * Vue Card UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'

/** Maps the Card `variant` prop values onto the ClassMap card variants. */
const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

/**
 * Vue Card UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Card: a styled surface `div`
 * whose children ride the default slot. `interactive` adds the button role,
 * the tab order and the interactive classes; a click emits `click` with the
 * original DOM event; `data-*` / `aria-*` fallthrough attributes (including
 * `data-mol-id`) reach the root element, and every other rest attribute is
 * dropped, exactly as React's passthrough filter does.
 */
export const Card = defineComponent({
  name: 'MCard',
  inheritAttrs: false,
  props: {
    variant: {
      type: String as PropType<'elevated' | 'outlined' | 'filled'>,
      default: 'elevated',
    },
    interactive: {
      type: Boolean,
      default: false,
    },
    padding: {
      type: String as PropType<Size | 'none'>,
      default: 'md',
    },
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
    testId: String,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()

    return () => {
      const paddingClass = props.padding === 'none' ? '' : cm.cardPadding(props.padding)
      const cardVariant = variantMap[props.variant] || 'default'

      const cardClasses = cm.cn(
        cm.card({ variant: cardVariant }),
        paddingClass,
        props.interactive && cm.cardInteractive,
        ...classOf(props.className, attrs),
      )

      // React forwards only data-* and aria-* from the rest props.
      const passthrough: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(restAttrs(attrs))) {
        if (key.startsWith('data-') || key.startsWith('aria-')) passthrough[key] = value
      }

      return h(
        'div',
        {
          class: cardClasses,
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          onClick: (event: MouseEvent) => emit('click', event),
          role: props.interactive ? 'button' : undefined,
          tabindex: props.interactive ? 0 : undefined,
          ...passthrough,
        },
        slots.default?.(),
      )
    }
  },
})

/**
 * Vue CardHeader UI component: the header row of a Card.
 *
 * Faithful port of `@molecule/app-ui-react`'s CardHeader: a `div` wearing
 * `cm.cardHeader` (plus `className`), with every rest attribute React spreads
 * (`id`, `aria-*`, `data-mol-id`, …) spread onto the same element. A click
 * emits `click` with the original DOM event.
 */
export const CardHeader = defineComponent({
  name: 'MCardHeader',
  inheritAttrs: false,
  props: {
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()

    return () =>
      h(
        'div',
        {
          class: cm.cn(cm.cardHeader, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

/**
 * Vue CardTitle UI component: the `h3` title of a Card.
 *
 * Faithful port of `@molecule/app-ui-react`'s CardTitle: an `h3` wearing
 * `cm.cardTitle` (plus `className`), with every rest attribute React spreads
 * spread onto the same element. A click emits `click` with the original DOM
 * event.
 */
export const CardTitle = defineComponent({
  name: 'MCardTitle',
  inheritAttrs: false,
  props: {
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()

    return () =>
      h(
        'h3',
        {
          class: cm.cn(cm.cardTitle, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

/**
 * Vue CardDescription UI component: the muted description paragraph of a Card.
 *
 * Faithful port of `@molecule/app-ui-react`'s CardDescription: a `p` wearing
 * `cm.cardDescription` (plus `className`), with every rest attribute React
 * spreads spread onto the same element. A click emits `click` with the
 * original DOM event.
 */
export const CardDescription = defineComponent({
  name: 'MCardDescription',
  inheritAttrs: false,
  props: {
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()

    return () =>
      h(
        'p',
        {
          class: cm.cn(cm.cardDescription, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

/**
 * Vue CardContent UI component: the body region of a Card.
 *
 * Faithful port of `@molecule/app-ui-react`'s CardContent: a `div` wearing
 * `cm.cardContent` (plus `className`), with every rest attribute React spreads
 * spread onto the same element. A click emits `click` with the original DOM
 * event.
 */
export const CardContent = defineComponent({
  name: 'MCardContent',
  inheritAttrs: false,
  props: {
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()

    return () =>
      h(
        'div',
        {
          class: cm.cn(cm.cardContent, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

/**
 * Vue CardFooter UI component: the footer row of a Card.
 *
 * Faithful port of `@molecule/app-ui-react`'s CardFooter: a `div` wearing
 * `cm.cardFooter` (plus `className`), with every rest attribute React spreads
 * spread onto the same element. A click emits `click` with the original DOM
 * event.
 */
export const CardFooter = defineComponent({
  name: 'MCardFooter',
  inheritAttrs: false,
  props: {
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()

    return () =>
      h(
        'div',
        {
          class: cm.cn(cm.cardFooter, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

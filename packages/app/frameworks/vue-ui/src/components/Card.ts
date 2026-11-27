/**
 * Vue Card UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, mergeProps, type PropType } from 'vue'

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { useElementRef } from '../utilities/elementRef.js'
import { setDisplayName } from './displayName.js'

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
 * the tab order and the interactive classes, and Enter/Space on the card
 * itself activate it by clicking the element; a click emits `click` with the
 * original DOM event; every other fallthrough attribute (`id`, `title`, `aria-*`,
 * `data-mol-id`, React's DOM event handlers) reaches the root element, as React's
 * rest spread does, and a caller's `onKeyDown` runs before the Enter/Space activation.
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
    disabled: Boolean,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () => {
      const paddingClass = props.padding === 'none' ? '' : cm.cardPadding(props.padding)
      const cardVariant = variantMap[props.variant] || 'default'

      const cardClasses = cm.cn(
        cm.card({ variant: cardVariant }),
        paddingClass,
        props.interactive && cm.cardInteractive,
        ...classOf(props.className, attrs),
      )

      // An interactive card is announced as a button and sits in the tab order, so
      // Enter and Space activate it the way they activate a native button: by
      // clicking it, which runs `onClick` with a real click event. Keys pressed in a
      // control inside the card belong to that control. Merged after the caller's
      // keydown listener, which runs first: its preventDefault() cancels the activation,
      // as it does on a native button.
      const handleKeyDown = (event: KeyboardEvent & { currentTarget: HTMLElement }): void => {
        if (
          event.defaultPrevented ||
          !props.interactive ||
          props.disabled ||
          event.target !== event.currentTarget
        )
          return
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        event.currentTarget.click()
      }

      return h(
        'div',
        mergeProps(
          {
            ref: element,
            class: cardClasses,
            style: styleOf(props.style, attrs),
            'data-testid': props.testId,
            role: props.interactive ? 'button' : undefined,
            // A disabled interactive card, like a disabled button, leaves the tab
            // order and is announced as disabled; a plain card renders no control.
            tabindex: props.interactive ? (props.disabled ? -1 : 0) : undefined,
            'aria-disabled': props.interactive && props.disabled ? true : undefined,
          },
          // React's rest spread: a caller's role or tabIndex replaces the interactive default.
          restAttrs(attrs),
          {
            // A disabled card never runs the caller's click (React drops `onClick`).
            onClick: props.disabled ? undefined : (event: MouseEvent) => emit('click', event),
            onKeydown: handleKeyDown,
          },
        ),
        slots.default?.(),
      )
    }
  },
})

setDisplayName(Card, 'Card')

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
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () =>
      h(
        'div',
        {
          ref: element,
          class: cm.cn(cm.cardHeader, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

setDisplayName(CardHeader, 'CardHeader')

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
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLHeadingElement>(expose)

    return () =>
      h(
        'h3',
        {
          ref: element,
          class: cm.cn(cm.cardTitle, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

setDisplayName(CardTitle, 'CardTitle')

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
    lang: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLParagraphElement>(expose)

    return () =>
      h(
        'p',
        {
          ref: element,
          class: cm.cn(cm.cardDescription, ...classOf(props.className, attrs)),
          lang: props.lang,
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

setDisplayName(CardDescription, 'CardDescription')

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
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () =>
      h(
        'div',
        {
          ref: element,
          class: cm.cn(cm.cardContent, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

setDisplayName(CardContent, 'CardContent')

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
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () =>
      h(
        'div',
        {
          ref: element,
          class: cm.cn(cm.cardFooter, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
  },
})

setDisplayName(CardFooter, 'CardFooter')

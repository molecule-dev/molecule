/**
 * Layout components.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Map component direction values ('column'/'column-reverse') to ClassMap
 * direction values ('col'/'col-reverse').
 * @param direction - The direction.
 * @returns The result.
 */
const toFlexDirection = (direction: string): 'row' | 'col' | 'row-reverse' | 'col-reverse' => {
  if (direction === 'column') return 'col'
  if (direction === 'column-reverse') return 'col-reverse'
  return direction as 'row' | 'row-reverse'
}

/**
 * Container component with ClassMap styling.
 */
export const Container = defineComponent({
  name: 'MContainer',
  props: {
    maxWidth: {
      type: String as PropType<'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string>,
      default: 'lg',
    },
    centered: {
      type: Boolean,
      default: true,
    },
    paddingX: String as PropType<Size | string>,
    class: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return () => {
      const knownSizes = ['sm', 'md', 'lg', 'xl', '2xl', 'full']
      const isKnownSize = knownSizes.includes(props.maxWidth)

      const containerClasses = cm.cn(
        isKnownSize && props.centered
          ? cm.container({ size: props.maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' })
          : cm.cn(
              cm.w('full'),
              isKnownSize && cm.maxW(props.maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'),
              props.centered && cm.mxAuto,
            ),
        props.class,
      )

      const containerStyle = !isKnownSize ? { maxWidth: props.maxWidth } : undefined

      return h('div', { class: containerClasses, style: containerStyle }, slots.default?.())
    }
  },
})

/**
 * Flex container component with ClassMap styling.
 */
export const Flex = defineComponent({
  name: 'MFlex',
  props: {
    direction: {
      type: String as PropType<'row' | 'column' | 'row-reverse' | 'column-reverse'>,
      default: 'row',
    },
    justify: String as PropType<'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'>,
    align: String as PropType<'start' | 'end' | 'center' | 'baseline' | 'stretch'>,
    wrap: String as PropType<'wrap' | 'nowrap' | 'wrap-reverse'>,
    gap: [String, Number] as PropType<Size | string | number>,
    class: String,
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    const cm = getClassMap()

    return () => {
      const knownGaps: string[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl']
      const isKnownGap = typeof props.gap === 'string' && knownGaps.includes(props.gap)
      const isPixelGap = typeof props.gap === 'number'

      const flexClasses = cm.cn(
        cm.flex({
          direction: toFlexDirection(props.direction),
          justify: props.justify,
          align: props.align,
          wrap: props.wrap,
          gap: isKnownGap ? (props.gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl') : undefined,
        }),
        props.class,
      )

      const gapStyle = isPixelGap
        ? { gap: `${props.gap}px` }
        : typeof props.gap === 'string' && !isKnownGap
          ? { gap: props.gap }
          : undefined

      return h(
        'div',
        {
          class: flexClasses,
          style: gapStyle,
          onClick: (e: MouseEvent) => emit('click', e),
        },
        slots.default?.(),
      )
    }
  },
})

/**
 * Grid container component with ClassMap styling.
 */
export const Grid = defineComponent({
  name: 'MGrid',
  props: {
    columns: [Number, String],
    rows: [Number, String],
    gap: [String, Number] as PropType<Size | string | number>,
    columnGap: [String, Number] as PropType<Size | string | number>,
    rowGap: [String, Number] as PropType<Size | string | number>,
    class: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return () => {
      const knownGaps: string[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl']
      const isKnownGap = typeof props.gap === 'string' && knownGaps.includes(props.gap)

      const gridClasses = cm.cn(
        cm.grid({
          cols: typeof props.columns === 'number' ? props.columns : undefined,
          gap: isKnownGap ? (props.gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl') : undefined,
        }),
        typeof props.rows === 'number' ? cm.gridRows(props.rows) : undefined,
        props.class,
      )

      const gridStyle: Record<string, string | number | undefined> = {
        gridTemplateColumns: typeof props.columns === 'string' ? props.columns : undefined,
        gridTemplateRows: typeof props.rows === 'string' ? props.rows : undefined,
        gap:
          typeof props.gap === 'number'
            ? props.gap
            : typeof props.gap === 'string' && !isKnownGap
              ? props.gap
              : undefined,
        columnGap:
          typeof props.columnGap === 'number'
            ? props.columnGap
            : typeof props.columnGap === 'string'
              ? props.columnGap
              : undefined,
        rowGap:
          typeof props.rowGap === 'number'
            ? props.rowGap
            : typeof props.rowGap === 'string'
              ? props.rowGap
              : undefined,
      }

      return h('div', { class: gridClasses, style: gridStyle }, slots.default?.())
    }
  },
})

/**
 * Spacer component with ClassMap styling.
 */
export const Spacer = defineComponent({
  name: 'MSpacer',
  props: {
    size: {
      type: [String, Number] as PropType<Size | string | number>,
      default: 'md',
    },
    horizontal: Boolean,
    class: String,
  },
  setup(props) {
    const cm = getClassMap()

    return () => {
      const knownSizes: string[] = ['xs', 'sm', 'md', 'lg', 'xl']
      const isKnownSize = typeof props.size === 'string' && knownSizes.includes(props.size)

      const spacerClasses = cm.cn(
        isKnownSize
          ? cm.spacer({
              size: props.size as Size,
              horizontal: props.horizontal,
            })
          : props.horizontal
            ? cm.displayInlineBlock
            : cm.displayBlock,
        props.class,
      )

      const sizeStyle: Record<string, string | undefined> =
        typeof props.size === 'number'
          ? props.horizontal
            ? { width: `${props.size}px`, height: '1px' }
            : { height: `${props.size}px`, width: '1px' }
          : typeof props.size === 'string' && !isKnownSize
            ? props.horizontal
              ? { width: props.size }
              : { height: props.size }
            : {}

      return h('div', { class: spacerClasses, style: sizeStyle })
    }
  },
})

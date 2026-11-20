/**
 * Vue layout UI components with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { ContainerProps, FlexProps, GridProps, Size, SpacerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { useElementRef } from '../utilities/elementRef.js'
import { setDisplayName } from './displayName.js'

/** The gap tokens the ClassMap accepts (anything else becomes an inline style). */
const GAP_TOKENS = ['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const

/** The spacer size tokens the ClassMap accepts. */
const SIZE_TOKENS = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/**
 * Merges an incoming style value with computed declarations the way React's
 * `{...style, ...computed}` object spread does.
 *
 * @param base - The incoming style prop value (object, string or array).
 * @param extra - The computed declarations, which win over `base`.
 * @returns The style value for `h()`, or `undefined` when neither is set.
 */
function mergeStyles(
  base: unknown,
  extra: Record<string, string | undefined> | undefined,
): unknown {
  if (extra === undefined) return base
  if (base === undefined || base === null) return extra
  if (typeof base === 'string') return [base, extra]
  if (Array.isArray(base)) return [...base, extra]
  return { ...(base as Record<string, unknown>), ...extra }
}

/**
 * Map component direction values ('column'/'column-reverse') to ClassMap
 * direction values ('col'/'col-reverse'), defaulting to 'row'.
 *
 * @param direction - The direction prop value.
 * @returns The ClassMap direction.
 */
const toFlexDirection = (direction: string): 'row' | 'col' | 'row-reverse' | 'col-reverse' => {
  const dirMap: Record<string, 'row' | 'col' | 'row-reverse' | 'col-reverse'> = {
    row: 'row',
    column: 'col',
    'row-reverse': 'row-reverse',
    'column-reverse': 'col-reverse',
  }
  return dirMap[direction] || 'row'
}

/**
 * Vue Container UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Container: a centered
 * max-width column styled by `cm.container({ size })`. `paddingX` is
 * accepted (React destructures it) but has no effect.
 */
export const Container = defineComponent({
  name: 'MContainer',
  inheritAttrs: false,
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
    className: String,
    style: [String, Object] as PropType<ContainerProps['style']>,
    testId: String,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () => {
      const containerClasses = cm.cn(
        cm.container({ size: props.maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' }),
        props.centered && cm.mxAuto,
        ...classOf(props.className, attrs),
      )

      return h(
        'div',
        {
          ref: element,
          class: containerClasses,
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
    }
  },
})

setDisplayName(Container, 'Container')

/**
 * Vue Flex UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Flex: a flex container whose
 * direction/justify/align/wrap map to `cm.flex()`; token gaps map to classes
 * while numeric and raw-string gaps become inline styles.
 */
export const Flex = defineComponent({
  name: 'MFlex',
  inheritAttrs: false,
  props: {
    direction: {
      type: String as PropType<'row' | 'column' | 'row-reverse' | 'column-reverse'>,
      default: 'row',
    },
    justify: String as PropType<'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'>,
    align: String as PropType<'start' | 'end' | 'center' | 'baseline' | 'stretch'>,
    wrap: String as PropType<'wrap' | 'nowrap' | 'wrap-reverse'>,
    gap: [String, Number] as PropType<FlexProps['gap']>,
    className: String,
    style: [String, Object] as PropType<FlexProps['style']>,
    testId: String,
  },
  setup(props, { attrs, slots, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () => {
      const cmDirection = toFlexDirection(props.direction)

      // Map gap to classMap accepted values
      const cmGap =
        typeof props.gap === 'string' && (GAP_TOKENS as readonly string[]).includes(props.gap)
          ? (props.gap as (typeof GAP_TOKENS)[number])
          : undefined

      const flexClasses = cm.cn(
        cm.flex({
          direction: cmDirection,
          align: props.align,
          justify: props.justify,
          wrap: props.wrap,
          gap: cmGap,
        }),
        ...classOf(props.className, attrs),
      )

      // If gap is a number or non-standard string, use an inline style
      // (numbers carry an explicit `px` — React's runtime appends it).
      const gapStyle =
        typeof props.gap === 'number'
          ? { gap: `${props.gap}px` }
          : typeof props.gap === 'string' && !(GAP_TOKENS as readonly string[]).includes(props.gap)
            ? { gap: props.gap }
            : undefined

      return h(
        'div',
        {
          ref: element,
          class: flexClasses,
          style: mergeStyles(styleOf(props.style, attrs), gapStyle),
          'data-testid': props.testId,
          // Every element prop (role, tabIndex, onClick, onKeyDown…) is forwarded
          // as given, the way Grid and Container forward theirs: a Flex is a plain
          // box, and a consumer that makes one clickable gives it the role and keys
          // that go with the click.
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
    }
  },
})

setDisplayName(Flex, 'Flex')

/**
 * Vue Grid UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Grid: column counts map to
 * `cm.grid({ cols })` while template strings and raw gaps become inline
 * styles.
 */
export const Grid = defineComponent({
  name: 'MGrid',
  inheritAttrs: false,
  props: {
    columns: [Number, String] as PropType<number | string>,
    rows: [Number, String] as PropType<number | string>,
    gap: [String, Number] as PropType<GridProps['gap']>,
    columnGap: [String, Number] as PropType<GridProps['columnGap']>,
    rowGap: [String, Number] as PropType<GridProps['rowGap']>,
    className: String,
    style: [String, Object] as PropType<GridProps['style']>,
    testId: String,
  },
  emits: ['click'],
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () => {
      const cmCols = typeof props.columns === 'number' ? props.columns : undefined
      const cmGap =
        typeof props.gap === 'string' && (GAP_TOKENS as readonly string[]).includes(props.gap)
          ? (props.gap as (typeof GAP_TOKENS)[number])
          : undefined

      const gridClasses = cm.cn(
        cm.grid({ cols: cmCols, gap: cmGap }),
        ...classOf(props.className, attrs),
      )

      // Only the values this Grid sets, as React's Grid does. Vue writes an undefined style key
      // as '' (removing that property), so `columnGap: undefined` after `gap` removed both gaps
      // `gap` had just set, and an undefined key erased the same property from the caller's style.
      const gridStyle: Record<string, string> = {}
      if (typeof props.columns === 'string') gridStyle.gridTemplateColumns = props.columns
      if (typeof props.rows === 'string') gridStyle.gridTemplateRows = props.rows
      if (typeof props.gap === 'number') gridStyle.gap = `${props.gap}px`
      else if (
        typeof props.gap === 'string' &&
        !(GAP_TOKENS as readonly string[]).includes(props.gap)
      )
        gridStyle.gap = props.gap
      if (typeof props.columnGap === 'number') gridStyle.columnGap = `${props.columnGap}px`
      else if (typeof props.columnGap === 'string') gridStyle.columnGap = props.columnGap
      if (typeof props.rowGap === 'number') gridStyle.rowGap = `${props.rowGap}px`
      else if (typeof props.rowGap === 'string') gridStyle.rowGap = props.rowGap

      return h(
        'div',
        {
          ref: element,
          class: gridClasses,
          style: mergeStyles(styleOf(props.style, attrs), gridStyle),
          'data-testid': props.testId,
          onClick: (event: MouseEvent) => emit('click', event),
          ...restAttrs(attrs),
        },
        slots.default?.(),
      )
    }
  },
})

setDisplayName(Grid, 'Grid')

/**
 * Vue Spacer UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Spacer: token sizes map to
 * `cm.spacer({ size, horizontal })`, raw sizes become inline styles, and
 * non-token sizes fall back to a plain block/inline-block element.
 */
export const Spacer = defineComponent({
  name: 'MSpacer',
  inheritAttrs: false,
  props: {
    size: {
      type: [String, Number] as PropType<SpacerProps['size']>,
      default: 'md',
    },
    horizontal: Boolean,
    className: String,
    style: [String, Object] as PropType<SpacerProps['style']>,
    testId: String,
  },
  emits: ['click'],
  setup(props, { attrs, emit, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () => {
      const isNamedSize =
        typeof props.size === 'string' && (SIZE_TOKENS as readonly string[]).includes(props.size)

      const spacerClasses = cm.cn(
        isNamedSize
          ? cm.spacer({ size: props.size as Size, horizontal: !!props.horizontal })
          : props.horizontal
            ? cm.displayInlineBlock
            : cm.displayBlock,
        ...classOf(props.className, attrs),
      )

      const sizeStyle: Record<string, string | undefined> | undefined =
        typeof props.size === 'number'
          ? props.horizontal
            ? { width: `${props.size}px`, height: '1px' }
            : { height: `${props.size}px`, width: '1px' }
          : typeof props.size === 'string' && !isNamedSize
            ? props.horizontal
              ? { width: props.size }
              : { height: props.size }
            : undefined

      return h('div', {
        ref: element,
        class: spacerClasses,
        style: mergeStyles(styleOf(props.style, attrs), sizeStyle),
        'data-testid': props.testId,
        onClick: (event: MouseEvent) => emit('click', event),
        ...restAttrs(attrs),
      })
    }
  },
})

setDisplayName(Spacer, 'Spacer')

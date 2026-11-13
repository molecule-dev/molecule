/**
 * Layout components.
 *
 * @module
 */

import { type Component, type JSX, splitProps } from 'solid-js'

import type { ContainerProps, FlexProps, GridProps, Size, SpacerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/** The gap tokens the ClassMap's `flex`/`grid` recipes accept. */
const GAP_SIZES = ['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const

/** The named spacer sizes. */
const SPACER_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/**
 * Renders the Container component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Container: Component<ContainerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'children',
    'maxWidth',
    'centered',
    'paddingX',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const containerClasses = (): string =>
    cm.cn(
      cm.container({
        size: (local.maxWidth ?? 'lg') as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full',
      }),
      (local.centered ?? true) && cm.mxAuto,
      local.className,
    )

  return (
    <div
      class={containerClasses()}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      {...(rest as JSX.HTMLAttributes<HTMLDivElement>)}
    >
      {local.children as JSX.Element}
    </div>
  )
}

/**
 * Renders the Flex container component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Flex: Component<FlexProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'children',
    'direction',
    'justify',
    'align',
    'wrap',
    'gap',
    'className',
    'style',
    'testId',
    'onClick',
  ])

  const cm = getClassMap()

  // Map direction names to classMap API ('column' -> 'col', etc.)
  const dirMap: Record<string, 'row' | 'col' | 'row-reverse' | 'col-reverse'> = {
    row: 'row',
    column: 'col',
    'row-reverse': 'row-reverse',
    'column-reverse': 'col-reverse',
  }
  const cmDirection = (): 'row' | 'col' | 'row-reverse' | 'col-reverse' =>
    dirMap[local.direction ?? 'row'] || 'row'

  const flexClasses = (): string =>
    cm.cn(
      cm.flex({
        direction: cmDirection(),
        align: local.align as FlexProps['align'],
        justify: local.justify as FlexProps['justify'],
        wrap: local.wrap as FlexProps['wrap'],
        gap:
          typeof local.gap === 'string' && (GAP_SIZES as readonly string[]).includes(local.gap)
            ? (local.gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
            : undefined,
      }),
      local.className,
    )

  // If gap is a number or non-standard string, use inline style
  const gapStyle = (): Record<string, string | number> | undefined =>
    typeof local.gap === 'number'
      ? { gap: local.gap }
      : typeof local.gap === 'string' && !(GAP_SIZES as readonly string[]).includes(local.gap)
        ? { gap: local.gap }
        : undefined

  return (
    <div
      class={flexClasses()}
      style={toStyleProps({ ...local.style, ...gapStyle() })}
      data-testid={local.testId}
      onClick={local.onClick as JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>}
      {...(rest as JSX.HTMLAttributes<HTMLDivElement>)}
    >
      {local.children as JSX.Element}
    </div>
  )
}

/**
 * Renders the Grid container component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Grid: Component<GridProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'children',
    'columns',
    'rows',
    'gap',
    'columnGap',
    'rowGap',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()

  const gridClasses = (): string =>
    cm.cn(
      cm.grid({
        cols: typeof local.columns === 'number' ? local.columns : undefined,
        gap:
          typeof local.gap === 'string' && (GAP_SIZES as readonly string[]).includes(local.gap)
            ? (local.gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
            : undefined,
      }),
      local.className,
    )

  const gridStyle = (): Record<string, string | number | undefined> => ({
    ...local.style,
    gridTemplateColumns: typeof local.columns === 'string' ? local.columns : undefined,
    gridTemplateRows: typeof local.rows === 'string' ? local.rows : undefined,
    gap:
      typeof local.gap === 'number'
        ? local.gap
        : typeof local.gap === 'string' && !(GAP_SIZES as readonly string[]).includes(local.gap)
          ? local.gap
          : undefined,
    columnGap:
      typeof local.columnGap === 'number'
        ? local.columnGap
        : typeof local.columnGap === 'string'
          ? local.columnGap
          : undefined,
    rowGap:
      typeof local.rowGap === 'number'
        ? local.rowGap
        : typeof local.rowGap === 'string'
          ? local.rowGap
          : undefined,
  })

  return (
    <div
      class={gridClasses()}
      style={toStyleProps(gridStyle())}
      data-testid={local.testId}
      {...(rest as JSX.HTMLAttributes<HTMLDivElement>)}
    >
      {local.children as JSX.Element}
    </div>
  )
}

/**
 * Renders the Spacer component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Spacer: Component<SpacerProps> = (props) => {
  const [local, rest] = splitProps(props, ['size', 'horizontal', 'className', 'style', 'testId'])

  const cm = getClassMap()
  const size = (): string | number => local.size ?? 'md'

  const isNamedSize = (): boolean =>
    typeof size() === 'string' && (SPACER_SIZES as readonly string[]).includes(size() as string)

  const spacerClasses = (): string =>
    cm.cn(
      isNamedSize()
        ? cm.spacer({ size: size() as Size, horizontal: !!local.horizontal })
        : local.horizontal
          ? cm.displayInlineBlock
          : cm.displayBlock,
      local.className,
    )

  const sizeStyle = (): Record<string, string | number> | undefined => {
    const s = size()
    if (typeof s === 'number') {
      return local.horizontal ? { width: s, height: '1px' } : { height: s, width: '1px' }
    }
    if (typeof s === 'string' && !isNamedSize()) {
      return local.horizontal ? { width: s } : { height: s }
    }
    return undefined
  }

  return (
    <div
      class={spacerClasses()}
      style={toStyleProps({ ...local.style, ...sizeStyle() })}
      data-testid={local.testId}
      {...(rest as JSX.HTMLAttributes<HTMLDivElement>)}
    />
  )
}

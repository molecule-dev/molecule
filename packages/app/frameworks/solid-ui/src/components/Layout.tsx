/**
 * Layout components.
 *
 * @module
 */

import { type Component, type JSX, splitProps } from 'solid-js'

import type { ContainerProps, FlexProps, GridProps, Size,SpacerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'


/**
 * Container component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Container: Component<ContainerProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'maxWidth',
    'centered',
    'paddingX',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const centered = (): boolean => local.centered ?? true

  const containerClasses = (): string =>
    cm.cn(
      cm.container({ size: (local.maxWidth ?? 'lg') as Size | '2xl' | 'full' }),
      centered() && cm.mxAuto,
      local.className,
    )

  const containerStyle = (): JSX.CSSProperties | undefined => {
    const mw = local.maxWidth ?? 'lg'
    const standardSizes = ['sm', 'md', 'lg', 'xl', '2xl', 'full']
    const customMaxWidth = !standardSizes.includes(mw) ? mw : undefined
    return customMaxWidth ? { ...local.style, 'max-width': customMaxWidth } : local.style
  }

  return (
    <div class={containerClasses()} style={containerStyle()} data-testid={local.testId}>
      {local.children as JSX.Element}
    </div>
  )
}

/**
 * Flex container component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Flex: Component<FlexProps> = (props) => {
  const [local] = splitProps(props, [
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

  const flexClasses = (): string =>
    cm.cn(
      cm.flex({
        direction: local.direction === 'column' ? 'col'
          : local.direction === 'column-reverse' ? 'col-reverse'
          : local.direction as 'row' | 'row-reverse' | undefined,
        align: local.align,
        justify: local.justify,
        wrap: local.wrap,
        gap: typeof local.gap === 'string' ? local.gap as 'xs' | 'sm' | 'md' | 'lg' | 'xl' : undefined,
      }),
      local.className,
    )

  const gapStyle = (): { gap: string } | undefined => {
    const gap = local.gap
    if (typeof gap === 'number') return { gap: `${gap}px` }
    if (typeof gap === 'string' && !['xs', 'sm', 'md', 'lg', 'xl', 'none'].includes(gap)) {
      return { gap }
    }
    return undefined
  }

  return (
    <div
      class={flexClasses()}
      style={{ ...local.style, ...gapStyle() }}
      data-testid={local.testId}
      onClick={local.onClick as JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>}
    >
      {local.children as JSX.Element}
    </div>
  )
}

/**
 * Grid container component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Grid: Component<GridProps> = (props) => {
  const [local] = splitProps(props, [
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
        gap: typeof local.gap === 'string' ? local.gap as 'xs' | 'sm' | 'md' | 'lg' | 'xl' : undefined,
      }),
      typeof local.rows === 'number' && cm.gridRows(local.rows as number),
      local.className,
    )

  const gridStyle = (): JSX.CSSProperties => ({
    ...local.style,
    'grid-template-columns': typeof local.columns === 'string' ? local.columns : undefined,
    'grid-template-rows': typeof local.rows === 'string' ? local.rows : undefined,
    gap:
      typeof local.gap === 'number'
        ? `${local.gap}px`
        : typeof local.gap === 'string' && !['xs', 'sm', 'md', 'lg', 'xl', 'none'].includes(local.gap)
          ? local.gap
          : undefined,
    'column-gap':
      typeof local.columnGap === 'number'
        ? `${local.columnGap}px`
        : typeof local.columnGap === 'string'
          ? local.columnGap
          : undefined,
    'row-gap':
      typeof local.rowGap === 'number'
        ? `${local.rowGap}px`
        : typeof local.rowGap === 'string'
          ? local.rowGap
          : undefined,
  })

  return (
    <div class={gridClasses()} style={gridStyle()} data-testid={local.testId}>
      {local.children as JSX.Element}
    </div>
  )
}

/**
 * Spacer component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Spacer: Component<SpacerProps> = (props) => {
  const [local] = splitProps(props, ['size', 'horizontal', 'className', 'style', 'testId'])

  const cm = getClassMap()
  const size = (): string | number => local.size ?? 'md'

  const spacerClasses = (): string => {
    const s = size()
    const isNamedSize = typeof s === 'string' && ['xs', 'sm', 'md', 'lg', 'xl'].includes(s)
    return cm.cn(
      isNamedSize ? cm.spacer({ size: s as Size, horizontal: local.horizontal }) : (local.horizontal ? cm.displayInlineBlock : cm.displayBlock),
      local.className,
    )
  }

  const sizeStyle = (): Record<string, string> | undefined => {
    const s = size()
    if (typeof s === 'number') {
      return local.horizontal
        ? { width: `${s}px`, height: '1px' }
        : { height: `${s}px`, width: '1px' }
    }
    if (typeof s === 'string' && !['xs', 'sm', 'md', 'lg', 'xl'].includes(s)) {
      return local.horizontal ? { width: s } : { height: s }
    }
    return undefined
  }

  return (
    <div
      class={spacerClasses()}
      style={{ ...local.style, ...sizeStyle() }}
      data-testid={local.testId}
    />
  )
}

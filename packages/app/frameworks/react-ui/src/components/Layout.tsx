/**
 * Layout components.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type {
  ContainerProps,
  CSSProperties,
  FlexProps,
  GridProps,
  Size,
  SpacerProps,
} from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, registerInline } from '@molecule/app-ui-react/elements'

import { rootProps } from '../utilities/rootProps.js'

// spacerSizeMap removed — use cm.spacer({ size, horizontal }) instead

/**
 * Container component.
 */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      maxWidth = 'lg',
      centered = true,
      paddingX: _paddingX,
      className,
      style,
      testId,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    const containerClasses = cm.cn(
      cm.container({ size: maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' }),
      centered && cm.mxAuto,
      className,
    )

    return (
      <Box
        as="div"
        ref={ref}
        className={containerClasses}
        webStyle={style}
        data-testid={testId}
        {...rootProps(rest)}
      >
        {children as React.ReactNode}
      </Box>
    )
  },
)

Container.displayName = 'Container'

/**
 * Flex container component.
 */
export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  (
    { children, direction = 'row', justify, align, wrap, gap, className, style, testId, ...rest },
    ref,
  ) => {
    const cm = getClassMap()

    // Map direction names to classMap API ('column' -> 'col', etc.)
    const dirMap: Record<string, 'row' | 'col' | 'row-reverse' | 'col-reverse'> = {
      row: 'row',
      column: 'col',
      'row-reverse': 'row-reverse',
      'column-reverse': 'col-reverse',
    }
    const cmDirection = dirMap[direction] || 'row'

    // Map gap to classMap accepted values
    const cmGap =
      typeof gap === 'string' && ['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
        ? (gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
        : undefined

    const flexClasses = cm.cn(
      cm.flex({
        direction: cmDirection,
        align: align as FlexProps['align'],
        justify: justify as FlexProps['justify'],
        wrap: wrap as FlexProps['wrap'],
        gap: cmGap,
      }),
      className,
    )

    // If gap is a number or non-standard string, use inline style
    const gapStyle =
      typeof gap === 'number'
        ? { gap }
        : typeof gap === 'string' && !['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
          ? { gap }
          : undefined

    return (
      <Box
        as="div"
        ref={ref}
        className={flexClasses}
        webStyle={{ ...style, ...gapStyle }}
        data-testid={testId}
        // Every element prop (role, tabIndex, onClick, onKeyDown…) is forwarded
        // as given, the way Grid and Container forward theirs: a Flex is a plain
        // box, and a consumer that makes one clickable gives it the role and keys
        // that go with the click.
        {...rootProps(rest)}
      >
        {children as React.ReactNode}
      </Box>
    )
  },
)

Flex.displayName = 'Flex'

/**
 * Grid container component.
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ children, columns, rows, gap, columnGap, rowGap, className, style, testId, ...rest }, ref) => {
    const cm = getClassMap()

    const cmCols = typeof columns === 'number' ? columns : undefined
    const cmGap =
      typeof gap === 'string' && ['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
        ? (gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
        : undefined

    const gridClasses = cm.cn(cm.grid({ cols: cmCols, gap: cmGap }), className)

    // Only the values this Grid sets. React writes an undefined style key as '' (removing that
    // property), so `columnGap: undefined` after `gap: 6` removed both gaps `gap` had just set and
    // a browser drew the class's gap instead of 6px, and an undefined key erased the same property
    // from the caller's `style`.
    const own: CSSProperties = {}
    if (typeof columns === 'string') own.gridTemplateColumns = columns
    if (typeof rows === 'string') own.gridTemplateRows = rows
    if (
      typeof gap === 'number' ||
      (typeof gap === 'string' && !['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(gap))
    )
      own.gap = gap
    if (typeof columnGap === 'number' || typeof columnGap === 'string') own.columnGap = columnGap
    if (typeof rowGap === 'number' || typeof rowGap === 'string') own.rowGap = rowGap
    const gridStyle: CSSProperties = { ...style, ...own }

    return (
      <Box
        as="div"
        ref={ref}
        className={gridClasses}
        webStyle={gridStyle}
        data-testid={testId}
        {...rootProps(rest)}
      >
        {children as React.ReactNode}
      </Box>
    )
  },
)

Grid.displayName = 'Grid'

/**
 * Spacer component.
 */
export const Spacer = forwardRef<HTMLDivElement, SpacerProps>(
  ({ size = 'md', horizontal, className, style, testId, ...rest }, ref) => {
    const cm = getClassMap()

    const isNamedSize = typeof size === 'string' && ['xs', 'sm', 'md', 'lg', 'xl'].includes(size)

    const spacerClasses = cm.cn(
      isNamedSize
        ? cm.spacer({ size: size as Size, horizontal: !!horizontal })
        : horizontal
          ? cm.displayInlineBlock
          : cm.displayBlock,
      className,
    )

    const sizeStyle: CSSProperties | undefined =
      typeof size === 'number'
        ? horizontal
          ? { width: size, height: '1px' }
          : { height: size, width: '1px' }
        : typeof size === 'string' && !isNamedSize
          ? horizontal
            ? { width: size }
            : { height: size }
          : undefined

    return (
      <Box
        as="div"
        ref={ref}
        className={spacerClasses}
        webStyle={{ ...style, ...sizeStyle }}
        data-testid={testId}
        {...rootProps(rest)}
      />
    )
  },
)

Spacer.displayName = 'Spacer'

// A horizontal spacer is inline-block, so it joins a line as an inline box does.
registerInline(Spacer, (props) => (props.horizontal ? 'box' : null))

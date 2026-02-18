/**
 * Layout components.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { ContainerProps, FlexProps, GridProps, Size,SpacerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

// spacerSizeMap removed — use cm.spacer({ size, horizontal }) instead

/**
 * Container component.
 */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ children, maxWidth = 'lg', centered = true, paddingX: _paddingX, className, style, testId }, ref) => {
    const cm = getClassMap()
    const containerClasses = cm.cn(
      cm.container({ size: maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' }),
      centered && cm.mxAuto,
      className,
    )

    return (
      <div ref={ref} className={containerClasses} style={style} data-testid={testId}>
        {children as React.ReactNode}
      </div>
    )
  },
)

Container.displayName = 'Container'

/**
 * Flex container component.
 */
export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  (
    { children, direction = 'row', justify, align, wrap, gap, className, style, testId, onClick },
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
    const cmGap = typeof gap === 'string' && ['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
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
    const gapStyle = typeof gap === 'number'
      ? { gap }
      : typeof gap === 'string' && !['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
        ? { gap }
        : undefined

    return (
      <div
        ref={ref}
        className={flexClasses}
        style={{ ...style, ...gapStyle }}
        data-testid={testId}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLDivElement>}
      >
        {children as React.ReactNode}
      </div>
    )
  },
)

Flex.displayName = 'Flex'

/**
 * Grid container component.
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ children, columns, rows, gap, columnGap, rowGap, className, style, testId }, ref) => {
    const cm = getClassMap()

    const cmCols = typeof columns === 'number' ? columns : undefined
    const cmGap = typeof gap === 'string' && ['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
      ? (gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
      : undefined

    const gridClasses = cm.cn(
      cm.grid({ cols: cmCols, gap: cmGap }),
      className,
    )

    const gridStyle: React.CSSProperties = {
      ...style,
      gridTemplateColumns: typeof columns === 'string' ? columns : undefined,
      gridTemplateRows: typeof rows === 'string' ? rows : undefined,
      gap:
        typeof gap === 'number'
          ? gap
          : typeof gap === 'string' && !['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
            ? gap
            : undefined,
      columnGap:
        typeof columnGap === 'number'
          ? columnGap
          : typeof columnGap === 'string'
            ? columnGap
            : undefined,
      rowGap:
        typeof rowGap === 'number'
          ? rowGap
          : typeof rowGap === 'string'
            ? rowGap
            : undefined,
    }

    return (
      <div ref={ref} className={gridClasses} style={gridStyle} data-testid={testId}>
        {children as React.ReactNode}
      </div>
    )
  },
)

Grid.displayName = 'Grid'

/**
 * Spacer component.
 */
export const Spacer = forwardRef<HTMLDivElement, SpacerProps>(
  ({ size = 'md', horizontal, className, style, testId }, ref) => {
    const cm = getClassMap()

    const isNamedSize = typeof size === 'string' && ['xs', 'sm', 'md', 'lg', 'xl'].includes(size)

    const spacerClasses = cm.cn(
      isNamedSize ? cm.spacer({ size: size as Size, horizontal: !!horizontal }) : (horizontal ? cm.displayInlineBlock : cm.displayBlock),
      className,
    )

    const sizeStyle: React.CSSProperties | undefined =
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
      <div
        ref={ref}
        className={spacerClasses}
        style={{ ...style, ...sizeStyle }}
        data-testid={testId}
      />
    )
  },
)

Spacer.displayName = 'Spacer'

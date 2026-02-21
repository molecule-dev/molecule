/**
 * Layout components for React Native.
 *
 * @module
 */

import React from 'react'
import { View } from 'react-native'

import type { ContainerProps, FlexProps, GridProps, Size, SpacerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Container component.
 * @param root0 - Component props.
 * @param root0.children - Container content.
 * @param root0.maxWidth - Maximum width constraint.
 * @param root0.centered - Whether centered.
 * @param root0.className - CSS class name override.
 * @param root0.style - Inline style object.
 * @param root0.testId - Test identifier.
 * @returns The rendered Container element.
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'lg',
  centered = true,
  className,
  style,
  testId,
}) => {
  const cm = getClassMap()
  const containerClasses = cm.cn(
    cm.container({ size: maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' }),
    centered && cm.mxAuto,
    className,
  )

  return (
    <View className={containerClasses} style={style as object} testID={testId}>
      {children as React.ReactNode}
    </View>
  )
}

/**
 * Renders a Flex component.
 * @param root0 - Component props.
 * @param root0.children - Flex content.
 * @param root0.direction - Flex direction.
 * @param root0.justify - Justify content.
 * @param root0.align - Align items.
 * @param root0.wrap - Flex wrap behavior.
 * @param root0.gap - Gap between items.
 * @param root0.className - CSS class name override.
 * @param root0.style - Inline style object.
 * @param root0.testId - Test identifier.
 * @param root0.onClick - Click handler.
 * @returns The rendered Flex element.
 */
export const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  justify,
  align,
  wrap,
  gap,
  className,
  style,
  testId,
  onClick,
}) => {
  const cm = getClassMap()

  const dirMap: Record<string, 'row' | 'col' | 'row-reverse' | 'col-reverse'> = {
    row: 'row',
    column: 'col',
    'row-reverse': 'row-reverse',
    'column-reverse': 'col-reverse',
  }
  const cmDirection = dirMap[direction] || 'row'

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

  return (
    <View
      className={flexClasses}
      style={style as object}
      testID={testId}
      {...(onClick ? { onTouchEnd: onClick as unknown as () => void } : {})}
    >
      {children as React.ReactNode}
    </View>
  )
}

/**
 * Renders a Grid component.
 * @param root0 - Component props.
 * @param root0.children - Grid content.
 * @param root0.columns - Number of columns.
 * @param root0.gap - Gap between items.
 * @param root0.className - CSS class name override.
 * @param root0.style - Inline style object.
 * @param root0.testId - Test identifier.
 * @returns The rendered Grid element.
 */
export const Grid: React.FC<GridProps> = ({ children, columns, gap, className, style, testId }) => {
  const cm = getClassMap()

  const cmCols = typeof columns === 'number' ? columns : undefined
  const cmGap =
    typeof gap === 'string' && ['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
      ? (gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
      : undefined

  const gridClasses = cm.cn(cm.grid({ cols: cmCols, gap: cmGap }), className)

  return (
    <View className={gridClasses} style={style as object} testID={testId}>
      {children as React.ReactNode}
    </View>
  )
}

/**
 * Renders a Spacer component.
 * @param root0 - Component props.
 * @param root0.size - Spacer size.
 * @param root0.horizontal - Whether horizontal.
 * @param root0.className - CSS class name override.
 * @param root0.style - Inline style object.
 * @param root0.testId - Test identifier.
 * @returns The rendered Spacer element.
 */
export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  horizontal,
  className,
  style,
  testId,
}) => {
  const cm = getClassMap()

  const isNamedSize = typeof size === 'string' && ['xs', 'sm', 'md', 'lg', 'xl'].includes(size)

  const spacerClasses = cm.cn(
    isNamedSize ? cm.spacer({ size: size as Size, horizontal: !!horizontal }) : '',
    className,
  )

  const sizeStyle =
    typeof size === 'number' ? (horizontal ? { width: size } : { height: size }) : undefined

  return (
    <View
      className={spacerClasses}
      style={{ ...(style as object), ...sizeStyle }}
      testID={testId}
    />
  )
}

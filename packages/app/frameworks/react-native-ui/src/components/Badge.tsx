/**
 * Badge component for React Native.
 *
 * @module
 */

import React from 'react'
import { Text, View } from 'react-native'

import type { BadgeProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Badge component.
 * @param root0 - Component props.
 * @param root0.children - Badge content.
 * @param root0.color - Badge color.
 * @param root0.variant - Visual variant style.
 * @param root0.size - Badge size.
 * @param root0.rounded - Whether rounded.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Badge element.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  color = 'primary',
  variant: _variant = 'solid',
  size = 'md',
  rounded = true,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const classes = cm.cn(cm.badge({ variant: color, size }), !rounded && cm.badgeSquare, className)

  return (
    <View className={classes} testID={testId}>
      <Text>{children as React.ReactNode}</Text>
    </View>
  )
}

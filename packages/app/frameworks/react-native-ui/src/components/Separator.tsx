/**
 * Separator component for React Native.
 *
 * @module
 */

import React from 'react'
import { View } from 'react-native'

import type { SeparatorProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Separator component.
 * @param root0 - Component props.
 * @param root0.orientation - Horizontal or vertical.
 * @param root0.decorative - Whether purely decorative.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Separator element.
 */
export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  decorative = true,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const classes = cm.cn(cm.separator({ orientation }), className)

  return (
    <View
      className={classes}
      testID={testId}
      accessibilityRole={decorative ? 'none' : ('separator' as never)}
    />
  )
}

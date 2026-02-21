/**
 * Tooltip component for React Native.
 *
 * On mobile, tooltips are triggered by long-press instead of hover.
 *
 * @module
 */

import React, { useState } from 'react'
import { Modal as RNModal, Pressable, Text, View } from 'react-native'

import type { TooltipProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Tooltip component.
 * @param root0 - Component props.
 * @param root0.children - Trigger element.
 * @param root0.content - Tooltip content.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Tooltip element.
 */
export const Tooltip: React.FC<TooltipProps> = ({ children, content, className, testId }) => {
  const cm = getClassMap()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <View className={className} testID={testId}>
      <Pressable
        className={cm.tooltipTrigger}
        onLongPress={() => setIsVisible(true)}
        onPressOut={() => setIsVisible(false)}
      >
        {children as React.ReactNode}
      </Pressable>

      <RNModal visible={isVisible} transparent animationType="fade">
        <Pressable className={cm.dialogOverlay} onPress={() => setIsVisible(false)}>
          <View className={cm.dialogWrapper}>
            <View className={cm.tooltip()}>
              <Text>{content as React.ReactNode}</Text>
            </View>
          </View>
        </Pressable>
      </RNModal>
    </View>
  )
}

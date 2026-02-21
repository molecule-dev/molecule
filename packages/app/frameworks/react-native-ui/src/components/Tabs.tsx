/**
 * Tabs component for React Native.
 *
 * @module
 */

import React, { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { TabsProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Tabs component.
 * @param root0 - Component props.
 * @param root0.items - Tab items array.
 * @param root0.value - Controlled active tab.
 * @param root0.defaultValue - Default active tab.
 * @param root0.onChange - Tab change handler.
 * @param root0.fitted - Whether tabs fill width.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Tabs element.
 */
export const Tabs: React.FC<TabsProps> = ({
  items = [],
  value: controlledValue,
  defaultValue,
  onChange,
  fitted,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || items[0]?.value || '')
  const activeValue = controlledValue ?? uncontrolledValue

  const handleChange = (newValue: string): void => {
    if (controlledValue === undefined) {
      setUncontrolledValue(newValue)
    }
    onChange?.(newValue)
  }

  const activeItem = items.find((item) => item.value === activeValue)

  return (
    <View className={className} testID={testId}>
      <View className={cm.cn(cm.tabsList, fitted && cm.tabsFitted)}>
        {items.map((item) => (
          <Pressable
            key={item.value}
            className={cm.cn(
              cm.tabsTrigger,
              fitted && cm.tabTriggerFitted,
              item.value === activeValue && cm.borderBPrimary,
            )}
            onPress={() => !item.disabled && handleChange(item.value)}
            disabled={item.disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.value === activeValue, disabled: item.disabled }}
          >
            {!!item.icon && (
              <View className={cm.tabTriggerIcon}>{item.icon as React.ReactNode}</View>
            )}
            <Text>{item.label as React.ReactNode}</Text>
          </Pressable>
        ))}
      </View>
      {!!activeItem?.content && (
        <View className={cm.tabsContent} accessibilityRole="summary">
          {activeItem.content as React.ReactNode}
        </View>
      )}
    </View>
  )
}

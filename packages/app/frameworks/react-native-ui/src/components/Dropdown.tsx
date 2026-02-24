/**
 * Dropdown component for React Native.
 *
 * Uses a Modal-based menu since React Native has no DOM positioning.
 *
 * @module
 */

import React, { useState } from 'react'
import { FlatList, Modal as RNModal, Pressable, Text, View } from 'react-native'

import type { DropdownProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Dropdown component.
 * @param root0 - Component props.
 * @param root0.trigger - Trigger element.
 * @param root0.items - Menu items array.
 * @param root0.onSelect - Item selection handler.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Dropdown element.
 */
export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items = [],
  onSelect,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <View className={className} testID={testId}>
      <Pressable className={cm.dropdownTrigger} onPress={() => setIsOpen(true)}>
        {trigger as React.ReactNode}
      </Pressable>

      <RNModal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable className={cm.dialogOverlay} onPress={() => setIsOpen(false)}>
          <View className={cm.cn(cm.actionSheet, 'pointer-events-auto')}>
            <FlatList
              data={items}
              keyExtractor={(item, index) => String(item.value ?? index)}
              renderItem={({ item }) => {
                if (item.separator) {
                  return <View className={cm.dropdownSeparator} />
                }

                return (
                  <Pressable
                    className={cm.cn(cm.dropdownItem, item.disabled && cm.dropdownItemDisabled)}
                    onPress={() => {
                      if (!item.disabled) {
                        onSelect?.(item.value)
                        setIsOpen(false)
                      }
                    }}
                    disabled={item.disabled}
                  >
                    {!!item.icon && (
                      <View className={cm.dropdownItemIcon}>{item.icon as React.ReactNode}</View>
                    )}
                    <Text className={cm.dropdownItemLabel}>{item.label as React.ReactNode}</Text>
                    {!!item.shortcut && (
                      <Text className={cm.dropdownItemShortcut}>
                        {item.shortcut as React.ReactNode}
                      </Text>
                    )}
                  </Pressable>
                )
              }}
            />
          </View>
        </Pressable>
      </RNModal>
    </View>
  )
}

/**
 * Renders a DropdownSeparator component.
 * @returns The rendered DropdownSeparator element.
 */
export const DropdownSeparator: React.FC = () => {
  const cm = getClassMap()
  return <View className={cm.dropdownSeparator} />
}

/**
 * Renders a DropdownLabel component.
 * @param root0 - Component props.
 * @param root0.children - Label content.
 * @returns The rendered DropdownLabel element.
 */
export const DropdownLabel: React.FC<{ children: unknown }> = ({ children }) => {
  const cm = getClassMap()
  return <Text className={cm.dropdownLabel}>{children as React.ReactNode}</Text>
}

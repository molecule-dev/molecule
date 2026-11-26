/**
 * Switch component for React Native.
 *
 * @module
 */

import React from 'react'
import { Switch as RNSwitch, Text, View } from 'react-native'

import { getClassMap } from '@molecule/app-ui'

import type { SwitchProps } from '../types.js'

/**
 * Renders a Switch component.
 * @param root0 - Component props.
 * @param root0.label - Switch label text.
 * @param root0.checked - Whether checked.
 * @param root0.onCheckedChange - Receives the new checked state.
 * @param root0.size - Switch size (unused in RN).
 * @param root0.disabled - Whether disabled.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Switch element.
 */
export const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  onCheckedChange,
  size: _size = 'md',
  disabled,
  className,
  testId,
}) => {
  const cm = getClassMap()

  return (
    <View className={cm.cn(cm.controlLabel, className)} testID={testId}>
      <RNSwitch
        value={!!checked}
        onValueChange={onCheckedChange}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityState={{ checked: !!checked, disabled }}
      />
      {!!label && (
        <Text className={cm.cn(cm.controlText, disabled && cm.controlDisabled)}>
          {label as React.ReactNode}
        </Text>
      )}
    </View>
  )
}

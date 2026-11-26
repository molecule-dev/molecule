/**
 * Checkbox component for React Native.
 *
 * @module
 */

import React from 'react'
import { Pressable, Text, View } from 'react-native'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { CheckboxProps } from '../types.js'

/**
 * Renders a Checkbox component.
 * @param root0 - Component props.
 * @param root0.label - Checkbox label text.
 * @param root0.checked - Whether checked.
 * @param root0.indeterminate - Whether indeterminate.
 * @param root0.onCheckedChange - Receives the new checked state.
 * @param root0.error - Error message.
 * @param root0.disabled - Whether disabled.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Checkbox element.
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  indeterminate,
  onCheckedChange,
  error,
  disabled,
  className,
  testId,
}) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const boxClasses = cm.cn(cm.checkbox({ error: !!error }), className)

  return (
    <Pressable
      className={cm.controlLabel}
      onPress={() => {
        if (!disabled) onCheckedChange?.(!checked)
      }}
      disabled={disabled}
      testID={testId}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: indeterminate ? 'mixed' : !!checked,
        disabled,
      }}
    >
      <View className={boxClasses}>
        {checked && !indeterminate && (
          <Text>{t('ui.icon.check', undefined, { defaultValue: '✓' })}</Text>
        )}
        {indeterminate && <Text>{t('ui.icon.minus', undefined, { defaultValue: '−' })}</Text>}
      </View>
      {!!label && (
        <Text className={cm.cn(cm.controlText, disabled && cm.controlDisabled)}>
          {label as React.ReactNode}
        </Text>
      )}
    </Pressable>
  )
}

/**
 * RadioGroup component for React Native.
 *
 * @module
 */

import React from 'react'
import { Pressable, Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { RadioGroupProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a RadioGroup component.
 * @param root0 - Component props.
 * @param root0.label - Group label text.
 * @param root0.options - Radio options array.
 * @param root0.value - Selected value.
 * @param root0.onChange - Change handler.
 * @param root0.direction - Layout direction.
 * @param root0.error - Error message.
 * @param root0.disabled - Whether disabled.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered RadioGroup element.
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  options = [],
  value,
  onChange,
  direction = 'vertical',
  error,
  disabled,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const layoutClasses = cm.radioGroupLayout(direction)

  return (
    <View
      className={className}
      testID={testId}
      accessibilityRole="radiogroup"
      accessibilityLabel={
        typeof label === 'string'
          ? label
          : t('ui.radioGroup.label', undefined, { defaultValue: 'Radio group' })
      }
    >
      {!!label && <Text className={cm.radioGroupLabel}>{label as React.ReactNode}</Text>}
      <View className={layoutClasses}>
        {options.map((option) => {
          const optValue = typeof option === 'string' ? option : option.value
          const optLabel = typeof option === 'string' ? option : option.label
          const optDisabled = disabled || (typeof option === 'object' && option.disabled)
          const isSelected = optValue === value

          return (
            <Pressable
              key={optValue}
              className={cm.controlLabel}
              onPress={() => {
                if (!optDisabled && onChange) {
                  onChange(optValue)
                }
              }}
              disabled={!!optDisabled}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled: !!optDisabled }}
            >
              <View className={cm.radio({ error: !!error })}>
                {isSelected && <View className={cm.roundedFull} />}
              </View>
              <Text className={cm.cn(cm.controlText, optDisabled && cm.controlDisabled)}>
                {optLabel as React.ReactNode}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {!!error && typeof error === 'string' && <Text className={cm.formError}>{error}</Text>}
    </View>
  )
}

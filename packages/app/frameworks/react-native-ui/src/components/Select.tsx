/**
 * Select component for React Native.
 *
 * Uses a Pressable that opens a Modal picker since React Native
 * has no native `<select>` element.
 *
 * @module
 */

import React, { useState } from 'react'
import { FlatList, Modal as RNModal, Pressable, Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { SelectProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Select component.
 * @param root0 - Component props.
 * @param root0.label - Select label text.
 * @param root0.options - Select options array.
 * @param root0.value - Selected value.
 * @param root0.onChange - Change handler.
 * @param root0.placeholder - Placeholder text.
 * @param root0.error - Error message.
 * @param root0.hint - Hint text.
 * @param root0.size - Select size.
 * @param root0.disabled - Whether disabled.
 * @param root0.required - Whether required.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Select element.
 */
export const Select: React.FC<SelectProps> = ({
  label,
  options = [],
  value,
  onChange,
  placeholder,
  error,
  hint,
  size = 'md',
  disabled,
  required,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const [isOpen, setIsOpen] = useState(false)
  const classes = cm.cn(cm.select({ error: !!error, size }), className)

  const selectedOption = options.find((opt) =>
    typeof opt === 'string' ? opt === value : opt.value === value,
  )
  const displayLabel = selectedOption
    ? typeof selectedOption === 'string'
      ? selectedOption
      : selectedOption.label
    : placeholder || t('ui.select.placeholder', undefined, { defaultValue: 'Select…' })

  return (
    <View className={cm.inputWrapper}>
      {!!label && (
        <Text className={cm.cn(cm.labelBlock, cm.label({ required: !!required }))}>
          {label as React.ReactNode}
        </Text>
      )}
      <Pressable
        className={classes}
        onPress={() => !disabled && setIsOpen(true)}
        testID={testId}
        accessibilityRole="combobox"
        accessibilityState={{ disabled, expanded: isOpen }}
      >
        <Text className={!selectedOption ? cm.textMuted : undefined}>{displayLabel}</Text>
        <Text className={cm.selectNative}>
          {t('ui.icon.chevronDown', undefined, { defaultValue: '▼' })}
        </Text>
      </Pressable>

      <RNModal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable className={cm.dialogOverlay} onPress={() => setIsOpen(false)}>
          <View className={cm.cn(cm.actionSheet, 'pointer-events-auto')}>
            <View className={cm.actionSheetHeader}>
              <Text className={cm.dialogTitle}>
                {label || t('ui.select.title', undefined, { defaultValue: 'Select' })}
              </Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item, index) =>
                typeof item === 'string' ? item : (item.value ?? String(index))
              }
              renderItem={({ item }) => {
                const optValue = typeof item === 'string' ? item : item.value
                const optLabel = typeof item === 'string' ? item : item.label
                const isSelected = optValue === value

                return (
                  <Pressable
                    className={cm.cn(cm.dropdownItem, isSelected && cm.textPrimary)}
                    onPress={() => {
                      if (onChange) {
                        onChange({ target: { value: optValue } } as unknown as Event)
                      }
                      setIsOpen(false)
                    }}
                  >
                    <Text>{optLabel}</Text>
                  </Pressable>
                )
              }}
            />
          </View>
        </Pressable>
      </RNModal>

      {!!error && typeof error === 'string' && <Text className={cm.formError}>{error}</Text>}
      {!!hint && !error && <Text className={cm.formHint}>{hint as React.ReactNode}</Text>}
    </View>
  )
}

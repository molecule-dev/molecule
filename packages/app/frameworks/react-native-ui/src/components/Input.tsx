/**
 * Input component for React Native.
 *
 * @module
 */

import React, { forwardRef, useCallback } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { InputProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Text input component.
 */
export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      leftElement,
      rightElement,
      clearable,
      className,
      style,
      testId,
      disabled,
      type,
      placeholder,
      value,
      onChange,
      onFocus,
      onBlur,
      required,
      ..._rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    const inputClasses = cm.cn(
      cm.input({ error: !!error, size }),
      !!leftElement && cm.inputPadLeft,
      !!(rightElement || clearable) && cm.inputPadRight,
      className,
    )

    const handleClear = useCallback(() => {
      if (onChange) {
        // Simulate a change event with empty value
        onChange({ target: { value: '' } } as unknown as Event)
      }
    }, [onChange])

    const secureTextEntry = type === 'password'
    const keyboardType =
      type === 'email'
        ? 'email-address'
        : type === 'number' || type === 'tel'
          ? 'numeric'
          : type === 'url'
            ? 'url'
            : 'default'

    return (
      <View className={cm.inputWrapper}>
        {!!label && (
          <Text className={cm.cn(cm.labelBlock, cm.label({ required: !!required }))}>
            {label as React.ReactNode}
          </Text>
        )}
        <View className={cm.inputInner}>
          {!!leftElement && (
            <View className={cm.inputLeftElement}>{leftElement as React.ReactNode}</View>
          )}
          <TextInput
            ref={ref}
            className={inputClasses}
            style={style as object}
            testID={testId}
            editable={!disabled}
            placeholder={placeholder}
            value={value as string | undefined}
            onChangeText={(text) => {
              if (onChange) {
                onChange({ target: { value: text } } as unknown as Event)
              }
            }}
            onFocus={onFocus as unknown as () => void}
            onBlur={onBlur as unknown as () => void}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            accessibilityLabel={typeof label === 'string' ? label : undefined}
          />
          {clearable && !!value && (
            <Pressable className={cm.inputClearButton} onPress={handleClear}>
              <Text>{t('ui.input.clear', undefined, { defaultValue: '×' })}</Text>
            </Pressable>
          )}
          {!!rightElement && !clearable && (
            <View className={cm.inputRightElement}>{rightElement as React.ReactNode}</View>
          )}
        </View>
        {!!error && typeof error === 'string' && <Text className={cm.formError}>{error}</Text>}
        {!!hint && !error && <Text className={cm.formHint}>{hint as React.ReactNode}</Text>}
      </View>
    )
  },
)

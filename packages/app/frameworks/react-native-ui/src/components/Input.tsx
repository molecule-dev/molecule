/**
 * Input component for React Native.
 *
 * @module
 */

import React, { forwardRef, useCallback } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { InputProps } from '../types.js'

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
      clearLabel,
      onClear,
      className,
      style,
      testId,
      disabled,
      type,
      placeholder,
      value,
      onValueChange,
      onFocus,
      onBlur,
      required,
      ..._rest
    },
    ref,
  ) => {
    const { t } = useTranslation()
    const cm = getClassMap()
    const inputClasses = cm.cn(
      cm.input({ error: !!error, size }),
      !!leftElement && cm.inputPadLeft,
      !!(rightElement || clearable) && cm.inputPadRight,
      className,
    )

    const handleClear = useCallback(() => {
      onClear?.()
      onValueChange?.('')
    }, [onClear, onValueChange])

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
            value={value === undefined ? undefined : String(value)}
            onChangeText={onValueChange}
            onFocus={onFocus ? () => onFocus() : undefined}
            onBlur={onBlur ? () => onBlur() : undefined}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            accessibilityLabel={typeof label === 'string' ? label : undefined}
          />
          {clearable && !!value && (
            <Pressable
              className={cm.inputClearButton}
              onPress={handleClear}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={
                clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' })
              }
            >
              <Text>{t('ui.icon.close', undefined, { defaultValue: '✕' })}</Text>
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

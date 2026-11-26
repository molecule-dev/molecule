/**
 * Textarea component for React Native.
 *
 * @module
 */

import React, { forwardRef } from 'react'
import { Text, TextInput, View } from 'react-native'

import { getClassMap } from '@molecule/app-ui'

import type { TextareaProps } from '../types.js'

/**
 * Multi-line text input component.
 */
export const Textarea = forwardRef<TextInput, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      rows = 3,
      className,
      style,
      testId,
      disabled,
      placeholder,
      value,
      onValueChange,
      onFocus,
      onBlur,
      required,
    },
    ref,
  ) => {
    const cm = getClassMap()
    const classes = cm.cn(cm.textarea({ error: !!error }), className)

    return (
      <View className={cm.inputWrapper}>
        {!!label && (
          <Text className={cm.cn(cm.labelBlock, cm.label({ required: !!required }))}>
            {label as React.ReactNode}
          </Text>
        )}
        <TextInput
          ref={ref}
          className={classes}
          style={style as object}
          testID={testId}
          editable={!disabled}
          placeholder={placeholder}
          value={value}
          multiline
          numberOfLines={rows}
          textAlignVertical="top"
          onChangeText={onValueChange}
          onFocus={onFocus ? () => onFocus() : undefined}
          onBlur={onBlur ? () => onBlur() : undefined}
          accessibilityLabel={typeof label === 'string' ? label : undefined}
        />
        {!!error && typeof error === 'string' && <Text className={cm.formError}>{error}</Text>}
        {!!hint && !error && <Text className={cm.formHint}>{hint as React.ReactNode}</Text>}
      </View>
    )
  },
)

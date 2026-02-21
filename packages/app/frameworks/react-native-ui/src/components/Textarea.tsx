/**
 * Textarea component for React Native.
 *
 * @module
 */

import React, { forwardRef } from 'react'
import { Text, TextInput, View } from 'react-native'

import type { TextareaProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
      onChange,
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
          value={value as string | undefined}
          multiline
          numberOfLines={rows}
          textAlignVertical="top"
          onChangeText={(text) => {
            if (onChange) {
              onChange({ target: { value: text } } as unknown as Event)
            }
          }}
          onFocus={onFocus as unknown as () => void}
          onBlur={onBlur as unknown as () => void}
          accessibilityLabel={typeof label === 'string' ? label : undefined}
        />
        {!!error && typeof error === 'string' && <Text className={cm.formError}>{error}</Text>}
        {!!hint && !error && <Text className={cm.formHint}>{hint as React.ReactNode}</Text>}
      </View>
    )
  },
)

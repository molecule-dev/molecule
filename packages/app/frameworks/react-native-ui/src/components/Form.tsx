/**
 * Form components for React Native.
 *
 * @module
 */

import React from 'react'
import { Text, View } from 'react-native'

import type { BaseProps, FormFieldProps, FormProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Local label props (not exported from `@molecule/app-ui`). */
interface LabelProps extends BaseProps {
  children?: unknown
  required?: boolean
}

/**
 * Renders a Form component.
 *
 * In React Native there is no `<form>` element. This is a View wrapper
 * that provides consistent spacing.
 * @param root0 - Component props.
 * @param root0.children - Form content.
 * @param root0.onSubmit - Submit handler (unused in RN).
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Form element.
 */
export const Form: React.FC<FormProps> = ({ children, onSubmit: _onSubmit, className, testId }) => {
  const cm = getClassMap()
  return (
    <View className={cm.cn(cm.formFieldset, className)} testID={testId}>
      {children as React.ReactNode}
    </View>
  )
}

/**
 * Renders a FormField component.
 * @param root0 - Component props.
 * @param root0.children - Field input content.
 * @param root0.label - Field label text.
 * @param root0.error - Error message.
 * @param root0.hint - Hint text.
 * @param root0.required - Whether required.
 * @param root0.className - CSS class name override.
 * @returns The rendered FormField element.
 */
export const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  error,
  hint,
  required,
  className,
}) => {
  const cm = getClassMap()
  return (
    <View className={cm.cn(cm.formField, className)}>
      {!!label && (
        <Text className={cm.cn(cm.labelBlock, cm.label({ required: !!required }))}>
          {label as React.ReactNode}
        </Text>
      )}
      <View className={cm.formFieldWrapper}>{children as React.ReactNode}</View>
      {!!error && typeof error === 'string' && <Text className={cm.formError}>{error}</Text>}
      {!!hint && !error && <Text className={cm.formHint}>{hint as React.ReactNode}</Text>}
    </View>
  )
}

/**
 * Renders a Label component.
 * @param root0 - Component props.
 * @param root0.children - Label content.
 * @param root0.required - Whether required.
 * @param root0.className - CSS class name override.
 * @returns The rendered Label element.
 */
export const Label: React.FC<LabelProps> = ({ children, required, className }) => {
  const cm = getClassMap()
  return (
    <Text className={cm.cn(cm.label({ required: !!required }), className)}>
      {children as React.ReactNode}
    </Text>
  )
}

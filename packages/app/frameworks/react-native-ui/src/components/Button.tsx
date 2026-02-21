/**
 * Button component for React Native.
 *
 * @module
 */

import React from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import type { ButtonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Button component.
 * @param root0 - Component props.
 * @param root0.children - Button content.
 * @param root0.variant - Visual variant.
 * @param root0.color - Color theme.
 * @param root0.size - Button size.
 * @param root0.loading - Whether loading.
 * @param root0.loadingText - Text while loading.
 * @param root0.fullWidth - Whether full width.
 * @param root0.leftIcon - Left icon element.
 * @param root0.rightIcon - Right icon element.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @param root0.disabled - Whether disabled.
 * @param root0.onClick - Click handler.
 * @returns The rendered Button element.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'solid',
  color = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  testId,
  disabled,
  onClick,
}) => {
  const cm = getClassMap()
  const classes = cm.cn(cm.button({ variant, color, size, fullWidth }), className)

  return (
    <Pressable
      className={classes}
      disabled={disabled || loading}
      onPress={onClick as unknown as () => void}
      testID={testId}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading && <ActivityIndicator size="small" className={cm.buttonIconLeft} />}
      {!loading && !!leftIcon && (
        <View className={cm.buttonIconLeft}>{leftIcon as React.ReactNode}</View>
      )}
      <Text>{loading && loadingText ? loadingText : (children as React.ReactNode)}</Text>
      {!loading && !!rightIcon && (
        <View className={cm.buttonIconRight}>{rightIcon as React.ReactNode}</View>
      )}
    </Pressable>
  )
}

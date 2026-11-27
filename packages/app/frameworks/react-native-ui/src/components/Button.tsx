/**
 * Button component for React Native.
 *
 * @module
 */

import React, { useCallback, useContext } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { getClassMap } from '@molecule/app-ui'

import { DisabledScope, FormScope, useFormRegistration } from '../elements/form.js'
import type { ButtonProps } from '../types.js'

/**
 * Renders a Button component. Submit buttons use the nearest FormArea, or
 * the enclosing HTML form on React Native Web.
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
 * @param root0.type - The button's form action.
 * @param root0.onClick - Called when the button is pressed.
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
  type = 'button',
  onClick,
}) => {
  const cm = getClassMap()
  const classes = cm.cn(cm.button({ variant, color, size, fullWidth }), className)
  const form = useContext(FormScope)
  const fieldsetDisabled = useContext(DisabledScope)
  const unavailable = Boolean(disabled || loading || fieldsetDisabled)
  const submit = type === 'submit' ? form?.submit : undefined
  const activate = (): void => {
    if (unavailable) return
    onClick?.()
    submit?.()
  }
  useFormRegistration(submit ? form?.buttons : undefined, {
    type,
    disabled: unavailable,
    activate,
  })

  // RNW gives the host type="button". Hand the default action back to the browser
  // only when there is no FormArea to perform validation and submit.
  const webType = type === 'submit' && !form ? 'submit' : 'button'
  const setWebType = useCallback(
    (host: View | null): void => {
      if (typeof HTMLButtonElement !== 'undefined' && host instanceof HTMLButtonElement) {
        host.type = webType
      }
    },
    [webType],
  )

  return (
    <Pressable
      ref={setWebType}
      className={classes}
      disabled={unavailable}
      onPress={onClick || submit ? activate : undefined}
      testID={testId}
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
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

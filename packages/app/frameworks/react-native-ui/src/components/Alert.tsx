/**
 * Alert component for React Native.
 *
 * @module
 */

import React from 'react'
import { Pressable, Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { AlertProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders an Alert component.
 * @param root0 - Component props.
 * @param root0.children - Alert body content.
 * @param root0.title - Alert title text.
 * @param root0.variant - Visual variant.
 * @param root0.status - Status type.
 * @param root0.icon - Leading icon element.
 * @param root0.dismissible - Whether dismissible.
 * @param root0.onDismiss - Dismiss handler.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Alert element.
 */
export const Alert: React.FC<AlertProps> = ({
  children,
  title,
  variant: _variant = 'subtle',
  status,
  icon,
  dismissible,
  onDismiss,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const classes = cm.cn(
    cm.alert({
      variant: (status || 'default') as 'default' | 'info' | 'success' | 'warning' | 'error',
    }),
    className,
  )

  return (
    <View className={classes} testID={testId} accessibilityRole="alert">
      {!!icon && <View className={cm.alertIconWrapper}>{icon as React.ReactNode}</View>}
      <View className={cm.alertContent}>
        {!!title && <Text className={cm.alertTitle}>{title as React.ReactNode}</Text>}
        {!!children && <Text className={cm.alertDescription}>{children as React.ReactNode}</Text>}
      </View>
      {dismissible && (
        <Pressable
          className={cm.alertDismiss}
          onPress={onDismiss}
          accessibilityLabel={t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })}
          accessibilityRole="button"
        >
          <Text>{t('ui.icon.close', undefined, { defaultValue: '✕' })}</Text>
        </Pressable>
      )}
    </View>
  )
}

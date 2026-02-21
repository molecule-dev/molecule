/**
 * Spinner component for React Native.
 *
 * @module
 */

import React from 'react'
import { ActivityIndicator, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { SpinnerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

const sizeMap: Record<string, 'small' | 'large'> = {
  xs: 'small',
  sm: 'small',
  md: 'small',
  lg: 'large',
  xl: 'large',
}

/**
 * Renders a Spinner component.
 * @param root0 - Component props.
 * @param root0.size - Spinner size.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Spinner element.
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, testId }) => {
  const cm = getClassMap()
  const classes = cm.cn(cm.spinner({ size }), className)

  return (
    <View
      className={classes}
      testID={testId}
      accessibilityRole="progressbar"
      accessibilityLabel={t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
    >
      <ActivityIndicator size={sizeMap[size] || 'small'} />
    </View>
  )
}

/**
 * Progress component for React Native.
 *
 * @module
 */

import React from 'react'
import { Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { BaseProps, ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Local progress props (not exported from `@molecule/app-ui`). */
interface ProgressProps extends BaseProps {
  value?: number
  max?: number
  label?: unknown
  showValue?: boolean
  color?: ColorVariant
  size?: Size
  indeterminate?: boolean
}

/**
 * Renders a Progress component.
 * @param root0 - Component props.
 * @param root0.value - Current progress value.
 * @param root0.max - Maximum progress value.
 * @param root0.label - Progress label text.
 * @param root0.showValue - Whether to show value.
 * @param root0.color - Progress bar color.
 * @param root0.size - Progress bar size.
 * @param root0.indeterminate - Whether indeterminate.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Progress element.
 */
export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  label,
  showValue,
  color = 'primary',
  size = 'md',
  indeterminate,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <View className={cm.cn(cm.progressWrapper, className)} testID={testId}>
      {(label || showValue) && (
        <View className={cm.progressLabelContainer}>
          {!!label && <Text className={cm.progressLabelText}>{label as React.ReactNode}</Text>}
          {showValue && (
            <Text className={cm.progressLabelText}>
              {t(
                'ui.progress.value',
                { value: String(Math.round(percentage)) },
                { defaultValue: '{{value}}%' },
              )}
            </Text>
          )}
        </View>
      )}
      <View
        className={cm.cn(cm.progress(), cm.progressHeight(size))}
        accessibilityRole="progressbar"
        accessibilityLabel={
          typeof label === 'string'
            ? label
            : t('ui.progress.label', undefined, { defaultValue: 'Progress' })
        }
        accessibilityValue={{
          min: 0,
          max,
          now: indeterminate ? undefined : value,
        }}
      >
        <View
          className={cm.cn(
            cm.progressBar(),
            cm.progressColor(color),
            indeterminate && cm.progressIndeterminate,
          )}
          style={indeterminate ? { width: '50%' } : { width: `${percentage}%` }}
        />
      </View>
    </View>
  )
}

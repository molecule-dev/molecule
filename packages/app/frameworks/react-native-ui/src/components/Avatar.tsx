/**
 * Avatar component for React Native.
 *
 * @module
 */

import React, { useState } from 'react'
import { Image, Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { AvatarProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders an Avatar component.
 * @param root0 - Component props.
 * @param root0.src - Image source URL.
 * @param root0.alt - Alt text for image.
 * @param root0.name - Display name for initials.
 * @param root0.fallback - Fallback element when image unavailable.
 * @param root0.size - Avatar size.
 * @param root0.rounded - Whether rounded (circular).
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Avatar element.
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  fallback,
  size = 'md',
  rounded = true,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const [imageError, setImageError] = useState(false)
  const namedSize = typeof size === 'string' ? size : undefined
  const classes = cm.cn(cm.avatar({ size: namedSize }), !rounded && cm.avatarSquare, className)

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : undefined

  return (
    <View className={classes} testID={testId}>
      {src && !imageError ? (
        <Image
          className={cm.avatarImage}
          source={{ uri: src }}
          accessibilityLabel={
            alt || name || t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' })
          }
          onError={() => setImageError(true)}
        />
      ) : initials ? (
        <Text className={cm.avatarInitials}>{initials}</Text>
      ) : fallback ? (
        <View className={cm.avatarFallbackIcon}>{fallback as React.ReactNode}</View>
      ) : (
        <Text className={cm.avatarFallback}>
          {alt?.[0]?.toUpperCase() || t('ui.avatar.fallback', undefined, { defaultValue: '?' })}
        </Text>
      )}
    </View>
  )
}

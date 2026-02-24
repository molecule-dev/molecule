/**
 * Avatar component.
 *
 * @module
 */

import React, { forwardRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import type { AvatarProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Get initials from a name.
 * @param name - The full name to extract initials from.
 * @returns The uppercase initials string.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Avatar component.
 */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size = 'md', rounded = true, fallback, className, style, testId }, ref) => {
    const [imageError, setImageError] = useState(false)

    const cm = getClassMap()
    const showFallback = !src || imageError

    const avatarSize = typeof size === 'number' ? undefined : size
    const containerClasses = cm.cn(
      cm.avatar({ size: avatarSize }),
      !rounded && cm.avatarSquare,
      className,
    )

    const customSize = typeof size === 'number' ? { width: size, height: size } : undefined

    return (
      <div
        ref={ref}
        className={containerClasses}
        style={{ ...style, ...customSize }}
        data-testid={testId}
      >
        {!showFallback ? (
          <img
            src={src}
            alt={alt || name || t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' })}
            className={cm.avatarImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={cm.avatarFallback}>
            {fallback ? (
              (fallback as React.ReactNode)
            ) : name ? (
              <span className={cm.avatarInitials}>{getInitials(name)}</span>
            ) : (
              renderIcon('user', cm.avatarFallbackIcon)
            )}
          </div>
        )}
      </div>
    )
  },
)

Avatar.displayName = 'Avatar'

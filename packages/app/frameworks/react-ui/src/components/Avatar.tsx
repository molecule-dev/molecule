/**
 * Avatar component.
 *
 * @module
 */

import React, { forwardRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { AvatarProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Image, Text } from '@molecule/app-ui-react/elements'

import { getInitials } from '../utilities/initials.js'
import { renderIcon } from '../utilities/renderIcon.js'
import { rootProps } from '../utilities/rootProps.js'

/**
 * Avatar component.
 */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      size = 'md',
      rounded = true,
      fallback: fallbackProp,
      className,
      style,
      testId,
      ...rest
    },
    ref,
  ) => {
    const fallback = slot(fallbackProp as React.ReactNode)
    const [imageError, setImageError] = useState(false)
    const { t } = useTranslation()

    const cm = getClassMap()

    const avatarSize = typeof size === 'number' ? undefined : size
    const containerClasses = cm.cn(
      cm.avatar({ size: avatarSize }),
      !rounded && cm.avatarSquare,
      className,
    )

    const customSize = typeof size === 'number' ? { width: size, height: size } : undefined

    return (
      <Box
        as="div"
        ref={ref}
        className={containerClasses}
        webStyle={{ ...style, ...customSize }}
        data-testid={testId}
        // Every other declared prop (id, title, aria-*, data-*, automationId as data-mol-id,
        // the DOM event handlers) reaches the root.
        {...rootProps(rest)}
      >
        {src && !imageError ? (
          <Image
            src={src}
            alt={alt || name || t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' })}
            className={cm.avatarImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <Box as="div" className={cm.avatarFallback}>
            {fallback ? (
              fallback
            ) : name ? (
              <Text as="span" className={cm.avatarInitials}>
                {getInitials(name)}
              </Text>
            ) : (
              renderIcon('user', cm.avatarFallbackIcon)
            )}
          </Box>
        )}
      </Box>
    )
  },
)

Avatar.displayName = 'Avatar'

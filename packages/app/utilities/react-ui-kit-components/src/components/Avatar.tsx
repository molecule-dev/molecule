/**
 * Avatar component.
 *
 * @module
 */

import { forwardRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { AvatarProps, ElementHandle } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { KitComponent, KitHosts } from '../hosts.js'
import { getInitials } from '../utilities/initials.js'
import { renderNode } from '../utilities/renderNode.js'
import { rootProps } from '../utilities/rootProps.js'

/**
 * Avatar component.
 */
export function createAvatar(
  hosts: Pick<KitHosts, 'Box' | 'Image' | 'Text' | 'renderIcon'>,
): KitComponent<AvatarProps> {
  const { Box, Image, Text, renderIcon } = hosts
  const Avatar = forwardRef<ElementHandle, AvatarProps>(
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
      const fallback = slot(renderNode(fallbackProp))
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
  return Avatar
}

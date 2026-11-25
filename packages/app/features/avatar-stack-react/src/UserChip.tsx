import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import {
  type AnchorProps,
  type BoxProps,
  type ForwardedElementProps,
  getClassMap,
} from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'
import { Anchor, Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link UserChip}. */
export interface UserChipProps extends ForwardedElementProps<
  BoxProps<ReactNode>,
  'children' | 'className'
> {
  /** Display name. */
  name: string
  /** Profile destination. Only the displayed name becomes a link; the avatar stays decorative. */
  href?: string
  /** Attributes for the canonical name link, including app styling and SPA navigation. */
  nameLinkProps?: ForwardedElementProps<AnchorProps<ReactNode>, 'href' | 'children'>
  /** Optional avatar image URL. */
  src?: string
  /** Optional secondary line (role / email / handle). */
  subtitle?: ReactNode
  /** Optional trailing content (action button, status dot, etc.). */
  trailing?: ReactNode
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer row. */
  className?: string
}

/**
 * Avatar + name + optional subtitle row — useful in dropdowns, mention
 * pickers, assignment popovers, and row-level user references.
 * @param props - Component props (see {@link UserChipProps}).
 */
export function UserChip({
  name,
  href,
  nameLinkProps,
  src,
  subtitle: subtitleProp,
  trailing,
  size = 'sm',
  className,
  ...rest
}: UserChipProps): JSX.Element {
  const subtitle = slot(subtitleProp)
  const cm = getClassMap()
  const avatar = <Avatar src={src} alt={name} name={name} size={size} />
  return (
    <Box {...rest} as="div" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
      {/* A linked chip hides the avatar from assistive tech so the link is the one name read
          out; an unlinked chip keeps the plain avatar, the same DOM every framework port renders. */}
      {href === undefined ? (
        avatar
      ) : (
        <Box as="div" aria-hidden="true">
          {avatar}
        </Box>
      )}
      <Box as="div" className={cm.cn(cm.flex1, cm.stack(0))}>
        {href === undefined ? (
          <Text as="span" className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {name}
          </Text>
        ) : (
          <Anchor
            data-mol-id="user-chip-profile"
            {...nameLinkProps}
            href={href}
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), nameLinkProps?.className)}
          >
            {name}
          </Anchor>
        )}
        {subtitle && (
          <Box as="span" className={cm.textSize('xs')}>
            {subtitle}
          </Box>
        )}
      </Box>
      {trailing}
    </Box>
  )
}

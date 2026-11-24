import type { AnchorHTMLAttributes, HTMLAttributes, JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

/** Props for {@link UserChip}. */
export interface UserChipProps extends HTMLAttributes<HTMLDivElement> {
  /** Display name. */
  name: string
  /** Profile destination. Only the displayed name becomes a link; the avatar stays decorative. */
  href?: string
  /** Attributes for the canonical name link, including app styling and SPA navigation. */
  nameLinkProps?: Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'href' | 'children' | 'dangerouslySetInnerHTML'
  >
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
    <div {...rest} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
      {/* A linked chip hides the avatar from assistive tech so the link is the one name read
          out; an unlinked chip keeps the plain avatar, the same DOM every framework port renders. */}
      {href === undefined ? avatar : <div aria-hidden="true">{avatar}</div>}
      <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        {href === undefined ? (
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{name}</span>
        ) : (
          <a
            data-mol-id="user-chip-profile"
            {...nameLinkProps}
            href={href}
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), nameLinkProps?.className)}
          >
            {name}
          </a>
        )}
        {subtitle && <span className={cm.textSize('xs')}>{subtitle}</span>}
      </div>
      {trailing}
    </div>
  )
}

/**
 * Slim promo bar that sits above the storefront top nav.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

/** Props for the {@link StorefrontAnnouncementBar} component. */
export interface StorefrontAnnouncementBarProps {
  message: ReactNode
  cta?: { to: string; label: ReactNode }
  className?: string
}

/** Storefront announcement / promo bar. */
export function StorefrontAnnouncementBar({
  message,
  cta,
  className,
}: StorefrontAnnouncementBarProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.textCenter,
        cm.sp('px', 4),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        cm.storefrontChromeAnnouncementBar,
        className,
      )}
    >
      {message}
      {cta ? (
        <>
          {' '}
          <Link
            className={cm.cn(cm.storefrontChromeAnnouncementLink)}
            data-mol-id="announcement-link"
            to={cta.to}
          >
            {cta.label}
          </Link>
        </>
      ) : null}
    </div>
  )
}

export default StorefrontAnnouncementBar

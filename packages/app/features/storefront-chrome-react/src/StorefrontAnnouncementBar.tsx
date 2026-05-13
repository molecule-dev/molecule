/**
 * Slim promo bar that sits above the storefront top nav.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface StorefrontAnnouncementBarProps {
  message: ReactNode
  cta?: { to: string; label: ReactNode }
  className?: string
}

/** Storefront announcement / promo bar. */
export function StorefrontAnnouncementBar({
  message,
  cta,
  className,
}: StorefrontAnnouncementBarProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.textCenter,
        cm.sp('px', 4),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        'bg-slate-900 text-white py-2.5',
        className,
      )}
    >
      {message}
      {cta ? (
        <>
          {' '}
          <Link
            className={cm.cn('underline underline-offset-4 hover:text-green-400 transition-colors')}
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

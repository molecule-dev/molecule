/**
 * Solid slim promo bar that sits above the storefront top nav.
 *
 * Solid counterpart of `@molecule/app-storefront-chrome-react`'s
 * `StorefrontAnnouncementBar` — the same props (React names), the same DOM for
 * the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { Link } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { StorefrontAnnouncementBarProps } from './types.js'

/**
 * Storefront announcement / promo bar.
 *
 * @param props - Component props (see {@link StorefrontAnnouncementBarProps}).
 * @returns The rendered announcement bar.
 */
export const StorefrontAnnouncementBar: Component<StorefrontAnnouncementBarProps> = (props) => {
  const cm = getClassMap()

  /** The CTA as a router link after the message (React's `cta ? … : null`). */
  const cta = (): JSX.Element => {
    if (!props.cta) return null
    const spec = props.cta
    return (
      <>
        {' '}
        <Link
          class={cm.cn(cm.storefrontChromeAnnouncementLink)}
          data-mol-id="announcement-link"
          to={spec.to}
        >
          {spec.label}
        </Link>
      </>
    )
  }

  return (
    <div
      class={cm.cn(
        cm.textCenter,
        cm.sp('px', 4),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        cm.storefrontChromeAnnouncementBar,
        props.className,
      )}
    >
      {props.message}
      {cta()}
    </div>
  )
}

export default StorefrontAnnouncementBar

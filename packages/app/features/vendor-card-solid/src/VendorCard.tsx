/**
 * Solid vendor / seller / agent profile card.
 *
 * Solid counterpart of `@molecule/app-vendor-card-react`'s `VendorCard` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Avatar, Card } from '@molecule/app-ui-solid'

import type { VendorCardProps } from './types.js'

/**
 * Vendor / seller / agent profile card. Used in marketplaces, agent
 * directories, multi-tenant catalogs.
 *
 * Composes `Card` + `Avatar` from `@molecule/app-ui-solid`. `onClick` makes
 * the whole card clickable but adds no keyboard handler or role — put primary
 * navigation in `actions` buttons for accessibility. `rating` renders a
 * single ★ plus the number (`toFixed(1)`), not a five-star row;
 * `reviewCount` renders only when `rating` is also set. When `name` is not a
 * plain string the Avatar alt falls back to hardcoded 'Vendor'.
 *
 * @param props - Component props (see {@link VendorCardProps}).
 * @returns The rendered vendor card.
 */
export const VendorCard: Component<VendorCardProps> = (props) => {
  const cm = getClassMap()
  const displayName = (): string => (typeof props.name === 'string' ? props.name : 'Vendor')
  return (
    <Card className={props.className} onClick={props.onClick}>
      <div class={cm.flex({ align: 'start', gap: 'md' })}>
        <Avatar src={props.logoSrc} alt={displayName()} name={displayName()} size="lg" />
        <div class={cm.cn(cm.flex1, cm.stack(2))}>
          <header>
            <h3 class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{props.name}</h3>
            {/* React's `{description && …}`: a falsy description renders nothing. */}
            {props.description && <p class={cm.textSize('sm')}>{props.description}</p>}
          </header>
          <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {/* React's `rating !== undefined`: a zero rating still renders. */}
            {props.rating !== undefined && (
              <span class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
                <span aria-hidden="true">★</span>
                <span class={cm.fontWeight('semibold')}>{props.rating.toFixed(1)}</span>
                {props.reviewCount !== undefined && <span>{`(${props.reviewCount})`}</span>}
              </span>
            )}
            {props.memberSince && <span class={cm.textSize('xs')}>· {props.memberSince}</span>}
            {props.badges}
          </div>
          {/* React's `{actions && …}`: a falsy actions row renders nothing. */}
          {props.actions && (
            <div class={cm.flex({ align: 'center', gap: 'sm' })}>{props.actions}</div>
          )}
        </div>
      </div>
    </Card>
  )
}

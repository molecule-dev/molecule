import type React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { Badge } from './types.js'

/** Props accepted by the {@link BadgeShelf} component. */
export interface BadgeShelfProps {
  /** Earned badges to display, ordered most-prominent-first. */
  badges: Badge[]
  /**
   * Maximum number of badge icons rendered inline. Any remaining are
   * summarised in a trailing `+N` overflow chip.
   *
   * @default 5
   */
  limit?: number
  /**
   * Click handler — invoked with the clicked badge (or `null` when the
   * trailing overflow chip is clicked, signalling "expand all").
   */
  onClick?: (badge: Badge | null) => void
  /** Extra classes merged onto the outer row. */
  className?: string
}

/**
 * Horizontal row of small badge icons earned by a user — used alongside
 * `<ReputationBadge>` to surface community achievements on profile
 * headers, post bylines, and detail pages.
 *
 * Each icon shows its name in a native `title` tooltip for low-friction
 * accessibility. Clicking a badge invokes `onClick(badge)`; clicking the
 * trailing `+N` chip invokes `onClick(null)` so the host page can expand
 * a full list.
 *
 * @param props - Component props (see {@link BadgeShelfProps}).
 * @returns The rendered shelf, or `null` if no badges are supplied.
 */
export function BadgeShelf({
  badges,
  limit = 5,
  onClick,
  className,
}: BadgeShelfProps): React.JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (!badges || badges.length === 0) return null

  const visible = badges.slice(0, limit)
  const overflow = Math.max(0, badges.length - visible.length)

  const shelfLabel = t(
    'badgeShelf.aria',
    { count: badges.length },
    { defaultValue: '{{count}} badges earned' },
  )

  return (
    <ul
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
      data-mol-id="badge-shelf"
      aria-label={shelfLabel}
    >
      {visible.map((badge) => {
        const tooltip = badge.description ? `${badge.name} — ${badge.description}` : badge.name
        const interactive = typeof onClick === 'function'
        const content = badge.iconSrc ? (
          <img
            src={badge.iconSrc}
            alt=""
            className={cm.cn(cm.shrink0)}
            style={{ width: 24, height: 24 }}
            data-mol-id="badge-shelf-icon-img"
          />
        ) : (
          <span aria-hidden="true" data-mol-id="badge-shelf-icon-glyph">
            {badge.icon ?? '*'}
          </span>
        )

        return (
          <li
            key={badge.id}
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
            data-mol-id="badge-shelf-item"
            data-badge-id={badge.id}
          >
            {interactive ? (
              <button
                type="button"
                className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull)}
                onClick={() => onClick?.(badge)}
                title={tooltip}
                aria-label={badge.name}
                data-mol-id="badge-shelf-button"
              >
                {content}
              </button>
            ) : (
              <span title={tooltip} aria-label={badge.name}>
                {content}
              </span>
            )}
          </li>
        )
      })}
      {overflow > 0 && (
        <li
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
          data-mol-id="badge-shelf-overflow"
        >
          {typeof onClick === 'function' ? (
            <button
              type="button"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
              )}
              onClick={() => onClick(null)}
              aria-label={t(
                'badgeShelf.overflow.aria',
                { count: overflow },
                { defaultValue: 'Show {{count}} more badges' },
              )}
              data-mol-id="badge-shelf-overflow-button"
            >
              +{overflow}
            </button>
          ) : (
            <span
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
              aria-label={t(
                'badgeShelf.overflow.aria',
                { count: overflow },
                { defaultValue: 'Show {{count}} more badges' },
              )}
            >
              +{overflow}
            </span>
          )}
        </li>
      )}
    </ul>
  )
}

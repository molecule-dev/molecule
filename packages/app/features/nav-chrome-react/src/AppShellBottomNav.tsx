import type { JSX } from 'react'

import { getClassMap } from '@molecule/app-ui'

import type { NavItem } from './types.js'

export interface AppShellBottomNavProps {
  items: NavItem[]
  activeId?: string
  onItemClick?: (item: NavItem) => void
  /** Extra classes. */
  className?: string
}

/**
 * Mobile/tablet bottom tab bar — typically 3–5 primary nav destinations.
 * Each item shows icon + short label. On desktop layouts this is usually
 * hidden via parent-level responsive chrome.
 * @param props - Component props (see {@link AppShellBottomNavProps}).
 */
export function AppShellBottomNav({
  items,
  activeId,
  onItemClick,
  className,
}: AppShellBottomNavProps): JSX.Element {
  const cm = getClassMap()
  return (
    <nav aria-label="Bottom" className={cm.cn(cm.flex({ align: 'stretch' }), className)}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onItemClick?.(it)}
          disabled={it.disabled}
          aria-current={it.id === activeId ? 'page' : undefined}
          className={cm.cn(
            cm.flex1,
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 2),
            cm.textSize('xs'),
            it.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
          )}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  )
}

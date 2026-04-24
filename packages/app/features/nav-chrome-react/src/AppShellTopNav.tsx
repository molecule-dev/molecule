import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import type { NavItem } from './types.js'

interface AppShellTopNavProps {
  /** Left-side brand / logo slot. */
  logo?: ReactNode
  /** Centre nav items (usually the primary app sections). */
  items?: NavItem[]
  /** Which item is currently active (by `id`). */
  activeId?: string
  /** Called when an item is clicked (hand off to your router). */
  onItemClick?: (item: NavItem) => void
  /** Right-side slot — user menu, notifications, theme toggle, etc. */
  right?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Top navigation shell — logo on the left, nav items in the centre,
 * app-level actions on the right. Fully slot-driven; apps decide what
 * to render in each position.
 * @param root0
 * @param root0.logo
 * @param root0.items
 * @param root0.activeId
 * @param root0.onItemClick
 * @param root0.right
 * @param root0.className
 */
export function AppShellTopNav({
  logo,
  items,
  activeId,
  onItemClick,
  right,
  className,
}: AppShellTopNavProps) {
  const cm = getClassMap()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        className,
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        {logo}
        {items && items.length > 0 && (
          <nav className={cm.flex({ align: 'center', gap: 'sm' })} aria-label="Main">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onItemClick?.(it)}
                disabled={it.disabled}
                aria-current={it.id === activeId ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('sm'),
                  it.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                )}
              >
                {it.icon}
                <span>{it.label}</span>
                {it.badge}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>{right}</div>
    </header>
  )
}

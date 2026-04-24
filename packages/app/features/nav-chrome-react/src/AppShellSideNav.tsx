import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import type { NavGroup, NavItem } from './types.js'

interface AppShellSideNavProps {
  /** Nav content: either a flat list of items or grouped sections. */
  items?: NavItem[]
  groups?: NavGroup[]
  /** Active item id. */
  activeId?: string
  /** Called when a nav item is clicked. */
  onItemClick?: (item: NavItem) => void
  /** Optional header slot (logo, workspace switcher). */
  header?: ReactNode
  /** Optional footer slot (theme toggle, sign-out). */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Vertical side nav shell. Pass either `items` for a flat list or
 * `groups` for a sectioned layout ("Main / Teams / Settings"). Header
 * and footer slots remain fixed while the middle scrolls.
 * @param root0
 * @param root0.items
 * @param root0.groups
 * @param root0.activeId
 * @param root0.onItemClick
 * @param root0.header
 * @param root0.footer
 * @param root0.className
 */
export function AppShellSideNav({
  items,
  groups,
  activeId,
  onItemClick,
  header,
  footer,
  className,
}: AppShellSideNavProps) {
  const cm = getClassMap()
  /**
   *
   * @param it
   */
  function renderItem(it: NavItem) {
    return (
      <button
        key={it.id}
        type="button"
        onClick={() => onItemClick?.(it)}
        disabled={it.disabled}
        aria-current={it.id === activeId ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          it.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
        )}
      >
        <span className={cm.flex({ align: 'center', gap: 'sm' })}>
          {it.icon}
          <span>{it.label}</span>
        </span>
        {it.badge}
      </button>
    )
  }
  return (
    <aside className={cm.cn(cm.stack(4), className)}>
      {header}
      <nav aria-label="Sidebar" className={cm.stack(4)}>
        {items && items.map(renderItem)}
        {groups &&
          groups.map((g) => (
            <section key={g.id} className={cm.stack(1 as const)}>
              {g.heading && (
                <h3 className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.sp('px', 3))}>
                  {g.heading}
                </h3>
              )}
              {g.items.map(renderItem)}
            </section>
          ))}
      </nav>
      {footer && <div className={cm.cn(cm.sp('mt', 'auto' as unknown as 0))}>{footer}</div>}
    </aside>
  )
}

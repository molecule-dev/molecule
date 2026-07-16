import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** A single navigable item in the settings sidebar. */
export interface SettingsSidebarItem {
  id: string
  label: ReactNode
  icon?: ReactNode
}

/** Props accepted by the {@link SettingsSidebar} component. */
export interface SettingsSidebarProps {
  items: SettingsSidebarItem[]
  activeId: string
  onSelect: (id: string) => void
  /** Optional footer inside the sidebar (sign-out, plan indicator). */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Vertical side-nav for Settings pages. Controlled — caller owns `activeId`.
 * @param props - Component props (see {@link SettingsSidebarProps}).
 */
export function SettingsSidebar({
  items,
  activeId,
  onSelect,
  footer,
  className,
}: SettingsSidebarProps): JSX.Element {
  const cm = getClassMap()
  return (
    <nav className={cm.cn(cm.stack(1 as const), className)} aria-label="Settings">
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              active ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        )
      })}
      {footer && <div className={cm.sp('mt', 4)}>{footer}</div>}
    </nav>
  )
}

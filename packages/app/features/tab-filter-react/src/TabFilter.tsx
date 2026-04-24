import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface TabFilterTab {
  /** Unique id / state key. */
  id: string
  /** Display label. */
  label: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Optional count badge (e.g. number of items matching this filter). */
  count?: number
  /** When true, the tab renders disabled. */
  disabled?: boolean
}

interface TabFilterProps {
  /** Tabs to render. */
  tabs: TabFilterTab[]
  /** Currently active tab id. */
  activeId: string
  /** Called when an enabled tab is clicked. */
  onChange: (id: string) => void
  /** Whether to allow the row to scroll horizontally. Defaults to true. */
  scrollable?: boolean
  /** Extra classes. */
  className?: string
}

/**
 * Horizontal pill-style tab row used as a segmented filter. Different
 * from `<Tabs>` from `@molecule/app-ui-react` in surfacing inline count
 * badges per tab and scrolling horizontally on overflow.
 *
 * Typical uses: "All (42) | Open (8) | Closed (34)", activity-type
 * filters, comment-thread filters, status switchers.
 * @param root0
 * @param root0.tabs
 * @param root0.activeId
 * @param root0.onChange
 * @param root0.scrollable
 * @param root0.className
 */
export function TabFilter({
  tabs,
  activeId,
  onChange,
  scrollable = true,
  className,
}: TabFilterProps) {
  const cm = getClassMap()
  return (
    <div
      role="tablist"
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
      style={scrollable ? { overflowX: 'auto', whiteSpace: 'nowrap' } : undefined}
    >
      {tabs.map((t) => {
        const active = t.id === activeId
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={t.disabled}
            onClick={() => onChange(t.id)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              active ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
              cm.roundedFull,
            )}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
                ({t.count.toLocaleString()})
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

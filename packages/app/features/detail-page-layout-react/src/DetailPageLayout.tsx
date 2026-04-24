import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface DetailPageLayoutProps {
  /** Breadcrumb rendered above everything. */
  breadcrumb?: ReactNode
  /** Sticky top bar — title, status, actions. */
  topBar?: ReactNode
  /** Main content column (usually stacked cards / sections). */
  main: ReactNode
  /** Optional sidebar column (related items, metadata cards). */
  sidebar?: ReactNode
  /** Sidebar position — `'right'` default or `'left'`. */
  sidebarPosition?: 'left' | 'right'
  /** Sidebar width preset. Defaults to `'md'`. */
  sidebarWidth?: 'sm' | 'md' | 'lg'
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

const SIDEBAR_WIDTH = { sm: 64, md: 80, lg: 96 } as const

/**
 * Two- or three-row detail-page scaffold.
 *
 * Layout: breadcrumb (optional), top bar (optional sticky), two-column
 * body with a main region and an optional sidebar on either side.
 * Apps fill the slots with their own cards/sections.
 * @param root0
 * @param root0.breadcrumb
 * @param root0.topBar
 * @param root0.main
 * @param root0.sidebar
 * @param root0.sidebarPosition
 * @param root0.sidebarWidth
 * @param root0.className
 * @param root0.dataMolId
 */
export function DetailPageLayout({
  breadcrumb,
  topBar,
  main,
  sidebar,
  sidebarPosition = 'right',
  sidebarWidth = 'md',
  className,
  dataMolId,
}: DetailPageLayoutProps) {
  const cm = getClassMap()
  const sidebarStyle = { flexBasis: `${SIDEBAR_WIDTH[sidebarWidth] * 4}px`, flexShrink: 0 }
  return (
    <div data-mol-id={dataMolId} className={cm.cn(cm.stack(4), className)}>
      {breadcrumb}
      {topBar}
      <div
        className={cm.cn(
          cm.flex({
            align: 'start',
            gap: 'lg',
            direction: sidebarPosition === 'left' ? 'row' : 'row',
          }),
        )}
      >
        {sidebar && sidebarPosition === 'left' && <aside style={sidebarStyle}>{sidebar}</aside>}
        <main className={cm.flex1}>
          <div className={cm.stack(4)}>{main}</div>
        </main>
        {sidebar && sidebarPosition === 'right' && <aside style={sidebarStyle}>{sidebar}</aside>}
      </div>
    </div>
  )
}

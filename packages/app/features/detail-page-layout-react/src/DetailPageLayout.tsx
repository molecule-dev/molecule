import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

/** Props for {@link DetailPageLayout}. */
export interface DetailPageLayoutProps {
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
 * @param props - Component props (see {@link DetailPageLayoutProps}).
 */
export function DetailPageLayout({
  breadcrumb,
  topBar,
  main,
  sidebar: sidebarProp,
  sidebarPosition = 'right',
  sidebarWidth = 'md',
  className,
  dataMolId,
}: DetailPageLayoutProps): JSX.Element {
  const sidebar = slot(sidebarProp)
  const cm = getClassMap()
  const sidebarStyle = { flexBasis: `${SIDEBAR_WIDTH[sidebarWidth] * 4}px`, flexShrink: 0 }
  return (
    <Box as="div" data-mol-id={dataMolId} className={cm.cn(cm.stack(4), className)}>
      {breadcrumb}
      {topBar}
      <Box
        as="div"
        className={cm.cn(
          cm.flex({
            align: 'start',
            gap: 'lg',
            direction: sidebarPosition === 'left' ? 'row' : 'row',
          }),
        )}
      >
        {sidebar && sidebarPosition === 'left' && (
          <Box as="aside" webStyle={sidebarStyle}>
            {sidebar}
          </Box>
        )}
        <Box as="main" className={cm.flex1}>
          <Box as="div" className={cm.stack(4)}>
            {main}
          </Box>
        </Box>
        {sidebar && sidebarPosition === 'right' && (
          <Box as="aside" webStyle={sidebarStyle}>
            {sidebar}
          </Box>
        )}
      </Box>
    </Box>
  )
}

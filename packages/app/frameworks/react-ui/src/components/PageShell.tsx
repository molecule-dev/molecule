/**
 * PageShell component — authenticated page wrapper with sidebar and top bar.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { PageShellProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * PageShell component.
 *
 * Provides the top-level layout for authenticated pages with an optional
 * collapsible sidebar, a top bar, and a scrollable main content area.
 */
export const PageShell = forwardRef<HTMLDivElement, PageShellProps>(
  (
    {
      children,
      sidebar,
      topbar,
      sidebarCollapsed,
      onSidebarToggle,
      className,
      style,
      testId,
      automationId,
    },
    ref,
  ) => {
    const cm = getClassMap()

    return (
      <div
        ref={ref}
        className={cm.cn(cm.pageShell, className)}
        style={style}
        data-testid={testId}
        data-mol-id={automationId}
      >
        {sidebar ? (
          <aside
            className={cm.cn(
              cm.pageShellSidebar,
              sidebarCollapsed && cm.pageShellSidebarCollapsed,
            )}
          >
            {onSidebarToggle ? (
              <button
                type="button"
                className={cm.pageShellSidebarToggle}
                onClick={onSidebarToggle}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? '\u25B6' : '\u25C0'}
              </button>
            ) : null}
            {sidebar as React.ReactNode}
          </aside>
        ) : null}
        <div className={cm.flex1}>
          {topbar ? (
            <header className={cm.pageShellTopbar}>{topbar as React.ReactNode}</header>
          ) : null}
          <main className={cm.pageShellContent}>{children as React.ReactNode}</main>
        </div>
      </div>
    )
  },
)

PageShell.displayName = 'PageShell'

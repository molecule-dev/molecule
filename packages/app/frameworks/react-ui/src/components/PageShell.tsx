/**
 * PageShell component — authenticated page wrapper with sidebar and top bar.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { PageShellProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable } from '@molecule/app-ui-react/elements'

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
      sidebar: sidebarProp,
      topbar: topbarProp,
      sidebarCollapsed,
      onSidebarToggle,
      className,
      style,
      testId,
      automationId,
    },
    ref,
  ) => {
    const sidebar = slot(sidebarProp as React.ReactNode)
    const topbar = slot(topbarProp as React.ReactNode)
    const cm = getClassMap()
    const { t } = useTranslation()

    return (
      <Box
        as="div"
        ref={ref}
        className={cm.cn(cm.pageShell, className)}
        webStyle={style}
        data-testid={testId}
        data-mol-id={automationId}
      >
        {sidebar ? (
          <Box
            as="aside"
            className={cm.cn(cm.pageShellSidebar, sidebarCollapsed && cm.pageShellSidebarCollapsed)}
          >
            {onSidebarToggle ? (
              <Pressable
                as="button"
                type="button"
                className={cm.pageShellSidebarToggle}
                onClick={onSidebarToggle}
                aria-label={
                  sidebarCollapsed
                    ? t('ui.pageShell.expandSidebar', undefined, { defaultValue: 'Expand sidebar' })
                    : t('ui.pageShell.collapseSidebar', undefined, {
                        defaultValue: 'Collapse sidebar',
                      })
                }
              >
                {sidebarCollapsed ? '\u25B6' : '\u25C0'}
              </Pressable>
            ) : null}
            {sidebar}
          </Box>
        ) : null}
        <Box as="div" className={cm.flex1}>
          {topbar ? (
            <Box as="header" className={cm.pageShellTopbar}>
              {topbar}
            </Box>
          ) : null}
          <Box as="main" className={cm.pageShellContent}>
            {children as React.ReactNode}
          </Box>
        </Box>
      </Box>
    )
  },
)

PageShell.displayName = 'PageShell'

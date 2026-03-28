/**
 * PageHeader component — consistent page title area with breadcrumbs and actions.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { PageHeaderProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * PageHeader component.
 *
 * Renders a page title with optional breadcrumb trail, description, and
 * action buttons for a consistent page heading area.
 */
export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, actions, breadcrumbs, className, style, testId, automationId }, ref) => {
    const cm = getClassMap()

    return (
      <div
        ref={ref}
        className={cm.cn(cm.pageHeader, className)}
        style={style}
        data-testid={testId}
        data-mol-id={automationId}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className={cm.pageHeaderBreadcrumbs} aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className={cm.pageHeaderBreadcrumbSeparator} aria-hidden="true">
                    /
                  </span>
                )}
                {crumb.href ? (
                  <a href={crumb.href} className={cm.pageHeaderBreadcrumbItem}>
                    {crumb.label}
                  </a>
                ) : (
                  <span className={cm.pageHeaderBreadcrumbItem}>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
          <div>
            <h1 className={cm.pageHeaderTitle}>{title}</h1>
            {description && <p className={cm.pageHeaderDescription}>{description}</p>}
          </div>
          {actions ? <div className={cm.pageHeaderActions}>{actions as React.ReactNode}</div> : null}
        </div>
      </div>
    )
  },
)

PageHeader.displayName = 'PageHeader'

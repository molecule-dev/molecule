/**
 * PageHeader component — consistent page title area with breadcrumbs and actions.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { PageHeaderProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Link, Text } from '@molecule/app-ui-react/elements'

/**
 * PageHeader component.
 *
 * Renders a page title with optional breadcrumb trail, description, and
 * action buttons for a consistent page heading area.
 */
export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    {
      title,
      description,
      actions: actionsProp,
      breadcrumbs,
      className,
      style,
      testId,
      automationId,
    },
    ref,
  ) => {
    const actions = slot(actionsProp as React.ReactNode)
    const { t } = useTranslation()
    const cm = getClassMap()

    return (
      <Box
        as="div"
        ref={ref}
        className={cm.cn(cm.pageHeader, className)}
        webStyle={style}
        data-testid={testId}
        data-mol-id={automationId}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Box
            as="nav"
            className={cm.pageHeaderBreadcrumbs}
            aria-label={t('ui.pageHeader.breadcrumbs', undefined, { defaultValue: 'Breadcrumb' })}
          >
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <Text as="span" className={cm.pageHeaderBreadcrumbSeparator} aria-hidden>
                    /
                  </Text>
                )}
                {crumb.href ? (
                  <Link to={crumb.href} className={cm.pageHeaderBreadcrumbItem}>
                    {crumb.label}
                  </Link>
                ) : (
                  <Text as="span" className={cm.pageHeaderBreadcrumbItem}>
                    {crumb.label}
                  </Text>
                )}
              </React.Fragment>
            ))}
          </Box>
        )}
        <Box as="div" className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
          <Box as="div">
            <Text as="h1" className={cm.pageHeaderTitle}>
              {title}
            </Text>
            {description && (
              <Text as="p" className={cm.pageHeaderDescription}>
                {description}
              </Text>
            )}
          </Box>
          {actions ? (
            <Box as="div" className={cm.pageHeaderActions}>
              {actions}
            </Box>
          ) : null}
        </Box>
      </Box>
    )
  },
)

PageHeader.displayName = 'PageHeader'

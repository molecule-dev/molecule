/**
 * EmptyState component — shown when a list or section has no data.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { slot } from '@molecule/app-react/render'
import type { EmptyStateProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/**
 * EmptyState component.
 *
 * Displays a centered placeholder with an optional icon, title, description,
 * and a primary action when a list or section has no content.
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon: iconProp,
      title,
      description,
      action: actionProp,
      className,
      style,
      testId,
      automationId,
    },
    ref,
  ) => {
    const icon = slot(iconProp as React.ReactNode)
    const action = slot(actionProp as React.ReactNode)
    const cm = getClassMap()

    return (
      <Box
        as="div"
        ref={ref}
        className={cm.cn(cm.emptyState, className)}
        webStyle={style}
        data-testid={testId}
        data-mol-id={automationId}
      >
        {icon ? (
          <Box as="div" className={cm.emptyStateIcon}>
            {icon}
          </Box>
        ) : null}
        <Text as="h3" className={cm.emptyStateTitle}>
          {title}
        </Text>
        {description ? (
          <Text as="p" className={cm.emptyStateDescription}>
            {description}
          </Text>
        ) : null}
        {action ? (
          <Box as="div" className={cm.emptyStateAction}>
            {action}
          </Box>
        ) : null}
      </Box>
    )
  },
)

EmptyState.displayName = 'EmptyState'

/**
 * EmptyState component — shown when a list or section has no data.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { slot } from '@molecule/app-react/render'
import type { EmptyStateProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
      <div
        ref={ref}
        className={cm.cn(cm.emptyState, className)}
        style={style}
        data-testid={testId}
        data-mol-id={automationId}
      >
        {icon ? <div className={cm.emptyStateIcon}>{icon}</div> : null}
        <h3 className={cm.emptyStateTitle}>{title}</h3>
        {description ? <p className={cm.emptyStateDescription}>{description}</p> : null}
        {action ? <div className={cm.emptyStateAction}>{action}</div> : null}
      </div>
    )
  },
)

EmptyState.displayName = 'EmptyState'

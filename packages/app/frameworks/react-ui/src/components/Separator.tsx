/**
 * Separator component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { BaseProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

/**
 * Props for the Separator component.
 */
export interface SeparatorProps extends BaseProps {
  /**
   * Orientation of the separator.
   */
  orientation?: 'horizontal' | 'vertical'

  /**
   * Decorative separators are purely visual.
   */
  decorative?: boolean
}

/**
 * Separator component.
 */
export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { orientation = 'horizontal', decorative = true, className, style, testId, automationId },
    ref,
  ) => {
    const cm = getClassMap()
    const separatorClasses = cm.cn(cm.separator({ orientation }), className)

    return (
      <Box
        as="div"
        ref={ref}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={decorative ? undefined : orientation}
        className={separatorClasses}
        webStyle={style}
        data-testid={testId}
        data-mol-id={automationId}
      />
    )
  },
)

Separator.displayName = 'Separator'

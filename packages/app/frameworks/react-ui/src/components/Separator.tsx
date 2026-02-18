/**
 * Separator component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { BaseProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
  ({ orientation = 'horizontal', decorative = true, className, style, testId }, ref) => {
    const cm = getClassMap()
    const separatorClasses = cm.cn(cm.separator({ orientation }), className)

    return (
      <div
        ref={ref}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={decorative ? undefined : orientation}
        className={separatorClasses}
        style={style}
        data-testid={testId}
      />
    )
  },
)

Separator.displayName = 'Separator'

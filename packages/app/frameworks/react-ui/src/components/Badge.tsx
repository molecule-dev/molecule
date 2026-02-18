/**
 * Badge component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { BadgeProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Badge component.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      color = 'primary',
      variant: _variant = 'solid',
      size,
      rounded = true,
      className,
      style,
      testId,
    },
    ref,
  ) => {
    const cm = getClassMap()

    const badgeClasses = cm.cn(
      cm.badge({ variant: color, size }),
      !rounded && cm.badgeSquare,
      className,
    )

    return (
      <span ref={ref} className={badgeClasses} style={style} data-testid={testId}>
        {children as React.ReactNode}
      </span>
    )
  },
)

Badge.displayName = 'Badge'

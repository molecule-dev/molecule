/**
 * Badge component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { BadgeProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, registerInline } from '@molecule/app-ui-react/elements'

import { rootProps } from '../utilities/rootProps.js'

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
      ...rest
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
      // Every other declared prop (id, title, aria-*, data-*, automationId as data-mol-id,
      // the event handlers) reaches the span.
      <Box
        as="span"
        ref={ref}
        className={badgeClasses}
        webStyle={style}
        data-testid={testId}
        {...rootProps(rest)}
      >
        {children as React.ReactNode}
      </Box>
    )
  },
)

Badge.displayName = 'Badge'

// A badge sits in a line of text, as an inline-flex span does on the web.
registerInline(Badge, () => 'box')

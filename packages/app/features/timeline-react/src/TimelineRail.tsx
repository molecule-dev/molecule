import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for the {@link TimelineRail} component. */
export interface TimelineRailProps {
  /** Marker for this row — typically a dot or icon. */
  marker?: ReactNode
  /** Whether to render the vertical connector below the marker. */
  connector?: boolean
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Left-hand rail of a timeline row — renders the marker and an optional
 * vertical connector extending downward.
 * @param props - Component props (see {@link TimelineRailProps}).
 */
export function TimelineRail({
  marker,
  connector = true,
  className,
}: TimelineRailProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Box
      as="div"
      className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.shrink0, className)}
    >
      <Box as="div">
        {marker ?? (
          <Text as="span" aria-hidden>
            •
          </Text>
        )}
      </Box>
      {connector && (
        <Box
          as="div"
          className={cm.cn(cm.w(0 as const), cm.h('full'))}
          style={{ opacity: 0.2, minHeight: 24 }}
          webStyle={{ borderLeft: '1px solid currentColor' }}
        />
      )}
    </Box>
  )
}

import type { JSX } from 'react'

/**
 * Single dot + icon marker used by `<ActivityTimeline>`. Exposed so
 * consumers can compose their own timeline layouts when the default
 * stacking shape doesn't fit.
 *
 * @module
 */
import { getClassMap } from '@molecule/app-ui'
import { Box, GlyphIcon } from '@molecule/app-ui-react/elements'

import type { TimelineKindTone } from './types.js'

interface ActivityTimelineDotProps {
  tone: TimelineKindTone
  className?: string
}

/** Dot + icon marker. */
export function ActivityTimelineDot({ tone, className }: ActivityTimelineDotProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Box
      as="div"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.w(6),
        cm.h(6),
        cm.position('absolute'),
        cm.roundedFull,
        // Consumer-supplied `dotClass`/`iconClass` win; the package defaults use
        // theme tokens (subtle primary fill + primary icon) that read correctly
        // in both light and dark — never a light-only literal.
        tone.dotClass ?? cm.bgPrimarySubtle,
        tone.iconClass ?? cm.textPrimary,
        className,
      )}
      style={{ left: 0, top: 0 }}
    >
      <GlyphIcon name={tone.icon} className={cm.textSize('xs')} />
    </Box>
  )
}

export default ActivityTimelineDot

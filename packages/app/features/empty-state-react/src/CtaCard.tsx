import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link CtaCard}. */
export interface CtaCardProps {
  /** Optional small eyebrow line above the title. */
  eyebrow?: ReactNode
  /** Primary heading. */
  title: ReactNode
  /** Supporting copy. */
  description?: ReactNode
  /** Primary call-to-action. */
  action?: ReactNode
  /** Optional visual / illustration rendered at the top or side. */
  media?: ReactNode
  /** `'horizontal'` renders media beside text; `'vertical'` stacks them. Defaults to `'vertical'`. */
  layout?: 'vertical' | 'horizontal'
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes. */
  className?: string
}

/**
 * A "soft sell" card used to promote a next-step action inside a page
 * body (e.g., "Connect your bank", "Invite teammates").
 *
 * Differs from `<EmptyState>` in being positioned in a list of cards
 * rather than filling the void. Supports a horizontal layout with the
 * media slot beside the text.
 * @param props - Component props (see {@link CtaCardProps}).
 */
export function CtaCard({
  eyebrow: eyebrowProp,
  title,
  description,
  action: actionProp,
  media: mediaProp,
  layout = 'vertical',
  dataMolId,
  className,
}: CtaCardProps): JSX.Element {
  const eyebrow = slot(eyebrowProp)
  const action = slot(actionProp)
  const media = slot(mediaProp)
  const cm = getClassMap()
  const direction = layout === 'horizontal' ? 'row' : 'col'
  return (
    <Box
      as="section"
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.flex({ direction, align: layout === 'horizontal' ? 'center' : 'stretch', gap: 'md' }),
        cm.sp('p', 6),
        className,
      )}
    >
      {media && (
        <Box as="div" className={cm.shrink0}>
          {media}
        </Box>
      )}
      <Box as="div" className={cm.cn(cm.flex1, cm.stack(2))}>
        {eyebrow && (
          <Box as="div" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
            {eyebrow}
          </Box>
        )}
        <Text as="h3" className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {title}
        </Text>
        {description && <Text as="p">{description}</Text>}
        {action && (
          <Box as="div" className={cm.sp('mt', 2)}>
            {action}
          </Box>
        )}
      </Box>
    </Box>
  )
}

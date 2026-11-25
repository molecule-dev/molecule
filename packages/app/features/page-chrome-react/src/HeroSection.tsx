import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link HeroSection}. */
export interface HeroSectionProps {
  /** Small eyebrow line above the headline. */
  eyebrow?: ReactNode
  /** Primary headline. */
  title: ReactNode
  /** Supporting description. */
  description?: ReactNode
  /** Primary call-to-action. */
  primaryAction?: ReactNode
  /** Optional secondary call-to-action. */
  secondaryAction?: ReactNode
  /** Optional visual / illustration slot, positioned to the right at md+. */
  media?: ReactNode
  /** Horizontal alignment — defaults to `start`. */
  align?: 'start' | 'center'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Dashboard / landing hero. Text column on the left, optional media on
 * the right. Alignment defaults to `start` for dashboards; use
 * `align="center"` for marketing-style landing heroes.
 * @param props - Component props (see {@link HeroSectionProps}).
 */
export function HeroSection({
  eyebrow: eyebrowProp,
  title,
  description: descriptionProp,
  primaryAction: primaryActionProp,
  secondaryAction: secondaryActionProp,
  media: mediaProp,
  align = 'start',
  className,
  dataMolId,
}: HeroSectionProps): JSX.Element {
  const eyebrow = slot(eyebrowProp)
  const description = slot(descriptionProp)
  const primaryAction = slot(primaryActionProp)
  const secondaryAction = slot(secondaryActionProp)
  const media = slot(mediaProp)
  const cm = getClassMap()
  return (
    <Box
      as="section"
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.flex({ align: 'center', justify: media ? 'between' : 'start', gap: 'lg', wrap: 'wrap' }),
        cm.sp('py', 10),
        className,
      )}
    >
      <Box
        as="div"
        className={cm.cn(cm.stack(4), cm.flex1, align === 'center' ? cm.textCenter : undefined)}
      >
        {eyebrow && (
          <Box as="div" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {eyebrow}
          </Box>
        )}
        <Text as="h1" className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>
          {title}
        </Text>
        {description && (
          <Text as="p" className={cm.cn(cm.textSize('lg'), cm.maxW('2xl'))}>
            {description}
          </Text>
        )}
        {(primaryAction || secondaryAction) && (
          <Box as="div" className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {primaryAction}
            {secondaryAction}
          </Box>
        )}
      </Box>
      {media && (
        <Box as="div" className={cm.shrink0}>
          {media}
        </Box>
      )}
    </Box>
  )
}

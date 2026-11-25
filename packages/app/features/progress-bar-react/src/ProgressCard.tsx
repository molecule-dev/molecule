import { type JSX, type ReactNode, useId } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

import { ProgressBar } from './ProgressBar.js'

/** Props for {@link ProgressCard}. */
export interface ProgressCardProps {
  title: ReactNode
  /** Optional supporting description below the title. */
  description?: ReactNode
  /** Optional icon shown in the card header. */
  icon?: ReactNode
  /** Current value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Value display on the right of the header (e.g. "73%"). */
  valueLabel?: ReactNode
  /** ProgressBar color. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the Card wrapper. */
  className?: string
  /** Additional content rendered below the bar. */
  children?: ReactNode
}

/**
 * `<Card>`-wrapped progress display with title, optional icon and description,
 * the progress bar itself, and an optional extras slot below. Useful for
 * budget/goal cards, storage-used panels, onboarding progress, etc.
 *
 * The bar is named by the title (`aria-labelledby`) and, when a description
 * renders, described by it (`aria-describedby`).
 * @param props - Component props (see {@link ProgressCardProps}).
 */
export function ProgressCard({
  title,
  description: descriptionProp,
  icon,
  value,
  max = 100,
  valueLabel: valueLabelProp,
  color = 'primary',
  className,
  children,
}: ProgressCardProps): JSX.Element {
  const description = slot(descriptionProp)
  const valueLabel = slot(valueLabelProp)
  const cm = getClassMap()
  const titleId = useId()
  const descriptionId = useId()
  return (
    <Card className={className}>
      <Box as="div" className={cm.stack(3)}>
        <Box as="div" className={cm.flex({ justify: 'between', align: 'start', gap: 'sm' })}>
          <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
            {icon}
            <Box as="div">
              <Text
                as="h3"
                id={titleId}
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}
              >
                {title}
              </Text>
              {description && (
                <Text as="p" id={descriptionId} className={cm.textSize('sm')}>
                  {description}
                </Text>
              )}
            </Box>
          </Box>
          {valueLabel && (
            <Box as="span" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {valueLabel}
            </Box>
          )}
        </Box>
        <ProgressBar
          value={value}
          max={max}
          color={color}
          labelledBy={titleId}
          describedBy={description ? descriptionId : undefined}
        />
        {children}
      </Box>
    </Card>
  )
}

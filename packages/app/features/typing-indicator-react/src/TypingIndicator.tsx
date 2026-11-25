import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, PulseDots } from '@molecule/app-ui-react/elements'

/** Props for the {@link TypingIndicator} component. */
export interface TypingIndicatorProps {
  /** Whether to render. Defaults to true. */
  visible?: boolean
  /** Dot diameter in CSS pixels or native dp. Defaults to 6. */
  dotSize?: number
  /** Animation duration in ms. Defaults to 1200. */
  durationMs?: number
  /**
   * Accessible label. Overrides the translated / `defaultValue` `'Typing…'`
   * (prop > `t()` > default).
   */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

/**
 * Three-dot "typing…" status. The dots pulse in sequence and stay still when
 * the browser or device requests reduced motion.
 * @param props - Component props (see {@link TypingIndicatorProps}).
 */
export function TypingIndicator({
  visible = true,
  dotSize = 6,
  durationMs = 1200,
  ariaLabel,
  className,
}: TypingIndicatorProps): JSX.Element | null {
  const { t } = useTranslation()
  const cm = getClassMap()
  if (!visible) return null
  const label = ariaLabel ?? t('typingIndicator.aria.label', undefined, { defaultValue: 'Typing…' })
  return (
    <Box
      as="span"
      role="status"
      aria-label={label}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
    >
      <PulseDots size={dotSize} durationMs={durationMs} />
    </Box>
  )
}

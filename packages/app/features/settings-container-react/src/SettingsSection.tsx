import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props accepted by the {@link SettingsSection} component. */
export interface SettingsSectionProps {
  /** Section heading. */
  title: ReactNode
  /** Optional description under the heading. */
  description?: ReactNode
  /** Section body. */
  children: ReactNode
  /** Optional footer row (save button, last-saved indicator). */
  footer?: ReactNode
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * One configuration section inside a Settings page — Card-wrapped, with
 * title / description header, body slot, and optional footer action row.
 * @param props - Component props (see {@link SettingsSectionProps}).
 */
export function SettingsSection({
  title,
  description: descriptionProp,
  children,
  footer: footerProp,
  className,
  dataMolId,
}: SettingsSectionProps): JSX.Element {
  const description = slot(descriptionProp)
  const footer = slot(footerProp)
  const cm = getClassMap()
  return (
    <Card className={className} data-mol-id={dataMolId}>
      <Box as="div" className={cm.stack(4)}>
        <Box as="header" className={cm.stack(1 as const)}>
          <Text as="h2" className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {title}
          </Text>
          {description && (
            <Text as="p" className={cm.textSize('sm')}>
              {description}
            </Text>
          )}
        </Box>
        <Box as="div">{children}</Box>
        {footer && (
          <Box as="footer" className={cm.flex({ justify: 'end', align: 'center', gap: 'sm' })}>
            {footer}
          </Box>
        )}
      </Box>
    </Card>
  )
}

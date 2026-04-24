import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

interface SettingsSectionProps {
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
 * @param root0
 * @param root0.title
 * @param root0.description
 * @param root0.children
 * @param root0.footer
 * @param root0.className
 * @param root0.dataMolId
 */
export function SettingsSection({
  title,
  description,
  children,
  footer,
  className,
  dataMolId,
}: SettingsSectionProps) {
  const cm = getClassMap()
  return (
    <Card className={className} data-mol-id={dataMolId}>
      <div className={cm.stack(4)}>
        <header className={cm.stack(1 as const)}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{title}</h2>
          {description && <p className={cm.textSize('sm')}>{description}</p>}
        </header>
        <div>{children}</div>
        {footer && (
          <footer className={cm.flex({ justify: 'end', align: 'center', gap: 'sm' })}>
            {footer}
          </footer>
        )}
      </div>
    </Card>
  )
}

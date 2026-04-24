import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'

interface DangerZoneSectionProps {
  /** Section title. */
  title: ReactNode
  /** Explanation of the destructive action. */
  description: ReactNode
  /** Label on the action button (e.g. "Delete account"). */
  actionLabel: ReactNode
  /** Called when the button is clicked. */
  onAction: () => void
  /** When true, the button disables and shows a loading label. */
  loading?: boolean
  /** When true, the button is disabled without loading. */
  disabled?: boolean
  /** Additional content between description and button (e.g. a confirm-text input). */
  children?: ReactNode
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Card-wrapped section for destructive actions — delete account,
 * reset data, revoke access. Uses the error/danger accent color and
 * puts the action on the right.
 * @param root0
 * @param root0.title
 * @param root0.description
 * @param root0.actionLabel
 * @param root0.onAction
 * @param root0.loading
 * @param root0.disabled
 * @param root0.children
 * @param root0.className
 * @param root0.dataMolId
 */
export function DangerZoneSection({
  title,
  description,
  actionLabel,
  onAction,
  loading,
  disabled,
  children,
  className,
  dataMolId,
}: DangerZoneSectionProps) {
  const cm = getClassMap()
  return (
    <Card className={className} data-mol-id={dataMolId}>
      <div className={cm.stack(3)}>
        <header className={cm.stack(1 as const)}>
          <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
          <p className={cm.textSize('sm')}>{description}</p>
        </header>
        {children}
        <div className={cm.flex({ justify: 'end' })}>
          <Button variant="solid" color="error" onClick={onAction} disabled={disabled || loading}>
            {loading ? '…' : actionLabel}
          </Button>
        </div>
      </div>
    </Card>
  )
}

import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'

/** Connection status for an integration. */
export type IntegrationStatus = 'connected' | 'disconnected' | 'pending' | 'error'

export interface IntegrationCardProps {
  /** Leading icon / logo for the integration. */
  icon?: ReactNode
  /** Integration title. */
  title: ReactNode
  /** Supporting description. */
  description?: ReactNode
  /** Current connection status. */
  status?: IntegrationStatus
  /** Action button configuration. */
  action?: {
    label: ReactNode
    onClick?: () => void
    href?: string
    loading?: boolean
    disabled?: boolean
  }
  /** `'card'` default, `'cta'` for premium gradient-tinted promos. */
  variant?: 'card' | 'cta'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Card for an integration / external connection (Slack, Stripe, Google
 * Drive, bank-link CTAs, etc.). Shows icon + title + description +
 * status + action.
 * @param props - Component props (see {@link IntegrationCardProps}).
 */
export function IntegrationCard({
  icon,
  title,
  description,
  status = 'disconnected',
  action,
  variant = 'card',
  className,
  dataMolId,
}: IntegrationCardProps): JSX.Element {
  const cm = getClassMap()
  const actionNode = action ? (
    action.href ? (
      <a href={action.href}>
        <Button disabled={action.disabled}>{action.label}</Button>
      </a>
    ) : (
      <Button onClick={action.onClick} disabled={action.disabled || action.loading}>
        {action.loading ? '…' : action.label}
      </Button>
    )
  ) : null
  return (
    <Card
      data-mol-id={dataMolId}
      className={className}
      style={
        variant === 'cta'
          ? {
              backgroundImage:
                'linear-gradient(135deg, var(--color-primary, #4070e0), var(--color-primary-container, #6b8fe8))',
            }
          : undefined
      }
    >
      <div className={cm.flex({ align: 'start', gap: 'md' })}>
        {icon && <div className={cm.shrink0}>{icon}</div>}
        <div className={cm.cn(cm.flex1, cm.stack(2))}>
          <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
          {description && <p className={cm.textSize('sm')}>{description}</p>}
          <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <StatusLabel status={status} />
            {actionNode}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Renders a small status badge for the current integration connection state.
 * @param props - Component props.
 */
function StatusLabel({ status }: { status: IntegrationStatus }): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label =
    status === 'connected'
      ? t('integrationCard.status.connected', {}, { defaultValue: 'Connected' })
      : status === 'pending'
        ? t('integrationCard.status.pending', {}, { defaultValue: 'Connecting…' })
        : status === 'error'
          ? t('integrationCard.status.error', {}, { defaultValue: 'Error' })
          : t('integrationCard.status.disconnected', {}, { defaultValue: 'Not connected' })
  return <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{label}</span>
}

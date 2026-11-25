import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'
import { Anchor, Box, Text } from '@molecule/app-ui-react/elements'

/** Connection status for an integration. */
export type IntegrationStatus = 'connected' | 'disconnected' | 'pending' | 'error'

/** Props for {@link IntegrationCard}. */
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
  icon: iconProp,
  title,
  description: descriptionProp,
  status = 'disconnected',
  action,
  variant = 'card',
  className,
  dataMolId,
}: IntegrationCardProps): JSX.Element {
  const icon = slot(iconProp)
  const description = slot(descriptionProp)
  const cm = getClassMap()
  const actionNode = action ? (
    action.href ? (
      <Anchor href={action.href}>
        <Button disabled={action.disabled}>{action.label}</Button>
      </Anchor>
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
      <Box as="div" className={cm.flex({ align: 'start', gap: 'md' })}>
        {icon && (
          <Box as="div" className={cm.shrink0}>
            {icon}
          </Box>
        )}
        <Box as="div" className={cm.cn(cm.flex1, cm.stack(2))}>
          <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {title}
          </Text>
          {description && (
            <Text as="p" className={cm.textSize('sm')}>
              {description}
            </Text>
          )}
          <Box as="div" className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <StatusLabel status={status} />
            {actionNode}
          </Box>
        </Box>
      </Box>
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
  return (
    <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
      {label}
    </Text>
  )
}

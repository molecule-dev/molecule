/**
 * Solid integration / connection card: icon + title + description + status
 * label + action button.
 *
 * Solid counterpart of `@molecule/app-integration-card-react`'s
 * `IntegrationCard` — the same props (React names), the same ClassMap tokens,
 * the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-solid'

import type { IntegrationCardProps, IntegrationStatus } from './types.js'

/** Action button configuration (React's `action` prop shape). */
type IntegrationCardAction = NonNullable<IntegrationCardProps['action']>

/**
 * The status label for one connection state, through `t()` under React's
 * `integrationCard.status.*` keys.
 *
 * @param status - The connection status.
 * @param t - The bonded translation function.
 * @returns The translated label.
 */
const statusLabel = (
  status: IntegrationStatus,
  t: ReturnType<typeof useTranslation>['t'],
): string =>
  status === 'connected'
    ? t('integrationCard.status.connected', {}, { defaultValue: 'Connected' })
    : status === 'pending'
      ? t('integrationCard.status.pending', {}, { defaultValue: 'Connecting…' })
      : status === 'error'
        ? t('integrationCard.status.error', {}, { defaultValue: 'Error' })
        : t('integrationCard.status.disconnected', {}, { defaultValue: 'Not connected' })

/**
 * Card for an integration / external connection (Slack, Stripe, Google
 * Drive, bank-link CTAs, etc.). Shows icon + title + description +
 * status + action.
 *
 * @param props - Component props (see {@link IntegrationCardProps}).
 * @returns The rendered integration card.
 */
export const IntegrationCard: Component<IntegrationCardProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** React's `status = 'disconnected'` default parameter. */
  const status = (): IntegrationStatus => props.status ?? 'disconnected'
  /** React's `variant = 'card'` default parameter. */
  const variant = (): 'card' | 'cta' => props.variant ?? 'card'

  /** The action's label, with React's loading ellipsis on the button branch. */
  const actionLabel = (action: IntegrationCardAction): JSX.Element =>
    !action.href && action.loading ? '…' : action.label

  /** The action node: an anchor around the Button when `href`, the Button otherwise. */
  const actionNode = (): JSX.Element => {
    const action = props.action
    if (!action) return null
    return action.href ? (
      <a href={action.href}>
        <Button disabled={Boolean(action.disabled)}>{actionLabel(action)}</Button>
      </a>
    ) : (
      <Button
        disabled={Boolean(action.disabled) || Boolean(action.loading)}
        onClick={(event: MouseEvent) => action.onClick?.(event)}
      >
        {actionLabel(action)}
      </Button>
    )
  }

  return (
    <Card
      className={props.className}
      data-mol-id={props.dataMolId}
      style={
        variant() === 'cta'
          ? {
              backgroundImage:
                'linear-gradient(135deg, var(--color-primary, #4070e0), var(--color-primary-container, #6b8fe8))',
            }
          : undefined
      }
    >
      <div class={cm.flex({ align: 'start', gap: 'md' })}>
        <Show when={props.icon}>
          <div class={cm.shrink0}>{props.icon}</div>
        </Show>
        <div class={cm.cn(cm.flex1, cm.stack(2))}>
          <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
          <Show when={props.description}>
            <p class={cm.textSize('sm')}>{props.description}</p>
          </Show>
          <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {statusLabel(status(), t)}
            </span>
            {actionNode()}
          </div>
        </div>
      </div>
    </Card>
  )
}

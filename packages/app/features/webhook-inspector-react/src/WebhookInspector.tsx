import type { ReactNode } from 'react'
import { useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Disclosure, Pressable, Text } from '@molecule/app-ui-react/elements'

/** Shape of a single webhook delivery attempt shown in the inspector. */
export interface WebhookDelivery {
  id: string
  /** Event type name (e.g. "payment.succeeded"). */
  eventType: string
  /** ISO timestamp or formatted string. */
  timestamp: ReactNode
  /** Response status. */
  statusCode: number
  /** Success / failure / pending. */
  status: 'success' | 'failure' | 'pending'
  /** Latency in ms. */
  durationMs?: number
  /** Request payload (string or JSON). */
  requestBody?: string | unknown
  /** Response body. */
  responseBody?: string | unknown
  /** Optional attempt number. */
  attempt?: number
}

/** Props for the {@link WebhookInspector} component. */
export interface WebhookInspectorProps {
  /** Deliveries to render. */
  deliveries: WebhookDelivery[]
  /** Called when a delivery is retried. */
  onRetry?: (delivery: WebhookDelivery) => void
  /** Called when a row is selected (for external detail panel). */
  onSelect?: (delivery: WebhookDelivery) => void
  /** Currently selected id. */
  selectedId?: string
  /** Extra classes. */
  className?: string
}

/**
 * Returns the semantic tone for the given delivery status: the theme's
 * success green, error red, or warning amber for a pending delivery.
 * @param status
 */
function statusTone(status: WebhookDelivery['status']): ColorVariant {
  if (status === 'success') return 'success'
  if (status === 'failure') return 'error'
  return 'warning'
}

/**
 * Webhook delivery log — one row per event with expandable
 * request/response JSON panels. Pass `onRetry` to show a retry button
 * per failed delivery.
 *
 * The retry button sits beside its row, outside the `<summary>`: a button
 * nested inside the disclosure's own toggle control is not reachable for
 * assistive technology, so it is a sibling of the `<details>` and describes
 * itself through the row's event type (`aria-describedby`).
 * @param props - Component props (see {@link WebhookInspectorProps}).
 */
export function WebhookInspector({
  deliveries,
  onRetry,
  onSelect,
  selectedId,
  className,
}: WebhookInspectorProps): ReactNode {
  const { t } = useTranslation()
  const cm = getClassMap()
  /** Stable base for the per-delivery ids this render mints. */
  const idPrefix = useId()
  /**
   * Serialises a request/response body value to a display string.
   * @param v
   */
  function stringify(v: string | unknown | undefined): string {
    if (v === undefined) return ''
    if (typeof v === 'string') return v
    try {
      return JSON.stringify(v, null, 2)
    } catch (_error) {
      // JSON.stringify can throw for circular references; String() fallback is safe here.
      return String(v)
    }
  }
  return (
    <Box as="div" className={cm.cn(cm.stack(1 as const), className)}>
      {deliveries.map((d, index) => {
        const selected = d.id === selectedId
        /** Names the event-type span so the retry button can describe itself by it. */
        const eventTypeId = `${idPrefix}-event-${index}`
        const retryable = Boolean(onRetry) && d.status === 'failure'
        return (
          <Box as="div" key={d.id} className={cm.flex({ align: 'start', gap: 'sm' })}>
            <Disclosure
              as="details"
              className={cm.cn(cm.flex1)}
              open={selected}
              onToggle={() => onSelect?.(d)}
              summaryProps={{
                className: cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('py', 1),
                  cm.sp('px', 2),
                  cm.textSize('xs'),
                  cm.cursorPointer,
                ),
              }}
              summary={
                <>
                  <Box as="span" webStyle={{ width: 80, opacity: 0.7 }}>
                    {d.timestamp}
                  </Box>
                  <Text
                    as="span"
                    className={cm.cn(cm.bgTone(statusTone(d.status)), cm.textOnTone)}
                    webStyle={{
                      minWidth: 70,
                      textAlign: 'center',
                      padding: '0px 6px',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    {d.statusCode}
                  </Text>
                  <Text
                    as="span"
                    id={retryable ? eventTypeId : undefined}
                    className={cm.cn(cm.fontWeight('semibold'), cm.flex1)}
                  >
                    {d.eventType}
                  </Text>
                  {d.attempt !== undefined && <Text as="span">#{d.attempt}</Text>}
                  {d.durationMs !== undefined && <Text as="span">{d.durationMs}ms</Text>}
                </>
              }
            >
              <Box as="div" className={cm.cn(cm.sp('p', 3), cm.stack(2))}>
                {d.requestBody !== undefined && (
                  <Box as="div" className={cm.stack(1 as const)}>
                    <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {t('webhookInspector.request', undefined, { defaultValue: 'Request' })}
                    </Text>
                    <Text as="pre" className={cm.textSize('xs')} webStyle={{ overflowX: 'auto' }}>
                      {stringify(d.requestBody)}
                    </Text>
                  </Box>
                )}
                {d.responseBody !== undefined && (
                  <Box as="div" className={cm.stack(1 as const)}>
                    <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {t('webhookInspector.response', undefined, { defaultValue: 'Response' })}
                    </Text>
                    <Text as="pre" className={cm.textSize('xs')} webStyle={{ overflowX: 'auto' }}>
                      {stringify(d.responseBody)}
                    </Text>
                  </Box>
                )}
              </Box>
            </Disclosure>
            {retryable && (
              // The button sits BESIDE the `<details>`: a button inside the
              // `<summary>` is nested-interactive — its own controls are the
              // disclosure toggle's children, so assistive technology cannot
              // reach it (and clicks needed preventDefault/stopPropagation).
              <Box as="span" className={cm.sp('py', 1)}>
                <Pressable
                  as="button"
                  type="button"
                  data-mol-id="webhook-inspector-retry"
                  // Was an unstyled native button — the one shape guaranteed
                  // NOT to match anything else in the app.
                  className={cm.cn(
                    cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                    cm.touchTargetCompact,
                  )}
                  aria-describedby={eventTypeId}
                  onClick={() => onRetry?.(d)}
                >
                  {t('webhookInspector.retry', undefined, { defaultValue: 'Retry' })}
                </Pressable>
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
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

interface WebhookInspectorProps {
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
 *
 * @param s
 */
function statusColor(s: WebhookDelivery['status']): string {
  if (s === 'success') return '#22c55e'
  if (s === 'failure') return '#ef4444'
  return '#eab308'
}

/**
 * Webhook delivery log — one row per event with expandable
 * request/response JSON panels. Pass `onRetry` to show a retry button
 * per failed delivery.
 * @param root0
 * @param root0.deliveries
 * @param root0.onRetry
 * @param root0.onSelect
 * @param root0.selectedId
 * @param root0.className
 */
export function WebhookInspector({
  deliveries,
  onRetry,
  onSelect,
  selectedId,
  className,
}: WebhookInspectorProps) {
  const cm = getClassMap()
  /**
   *
   * @param v
   */
  function stringify(v: string | unknown | undefined): string {
    if (v === undefined) return ''
    if (typeof v === 'string') return v
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
  }
  return (
    <div className={cm.cn(cm.stack(1 as const), className)}>
      {deliveries.map((d) => {
        const selected = d.id === selectedId
        return (
          <details key={d.id} open={selected} onToggle={() => onSelect?.(d)}>
            <summary
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('py', 1),
                cm.sp('px', 2),
                cm.textSize('xs'),
                cm.cursorPointer,
              )}
            >
              <span style={{ width: 80, opacity: 0.7 }}>{d.timestamp}</span>
              <span
                style={{
                  minWidth: 70,
                  textAlign: 'center',
                  padding: '0 6px',
                  borderRadius: 4,
                  background: statusColor(d.status),
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {d.statusCode}
              </span>
              <span className={cm.cn(cm.fontWeight('semibold'), cm.flex1)}>{d.eventType}</span>
              {d.attempt !== undefined && <span>#{d.attempt}</span>}
              {d.durationMs !== undefined && <span>{d.durationMs}ms</span>}
              {onRetry && d.status === 'failure' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onRetry(d)
                  }}
                >
                  Retry
                </button>
              )}
            </summary>
            <div className={cm.cn(cm.sp('p', 3), cm.stack(2))}>
              {d.requestBody !== undefined && (
                <div className={cm.stack(1 as const)}>
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                    Request
                  </span>
                  <pre className={cm.textSize('xs')} style={{ overflowX: 'auto' }}>
                    {stringify(d.requestBody)}
                  </pre>
                </div>
              )}
              {d.responseBody !== undefined && (
                <div className={cm.stack(1 as const)}>
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                    Response
                  </span>
                  <pre className={cm.textSize('xs')} style={{ overflowX: 'auto' }}>
                    {stringify(d.responseBody)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}

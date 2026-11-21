/**
 * Solid webhook delivery-log inspector: one `<details>` row per delivery with
 * a colored status-code badge, event type, optional attempt/duration and a
 * retry button on failed rows, expanding to the request and response JSON
 * panels.
 *
 * Solid counterpart of `@molecule/app-webhook-inspector-react`'s
 * `WebhookInspector` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, createUniqueId, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { WebhookDelivery, WebhookInspectorProps } from './types.js'

/**
 * Returns the semantic tone for the given delivery status: the theme's
 * success green, error red, or warning amber for a pending delivery.
 *
 * @param status - The delivery status.
 * @returns The badge's tone.
 */
const statusTone = (status: WebhookDelivery['status']): ColorVariant => {
  if (status === 'success') return 'success'
  if (status === 'failure') return 'error'
  return 'warning'
}

/**
 * Serialises a request/response body value to a display string.
 *
 * @param value - The body value.
 * @returns The text to render.
 */
const stringify = (value: string | unknown | undefined): string => {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (_error) {
    // JSON.stringify can throw for circular references; String() fallback is safe here.
    return String(value)
  }
}

/**
 * Webhook delivery log — one row per event with expandable request/response
 * JSON panels. Pass `onRetry` to show a retry button per failed delivery.
 *
 * Rows are native `<details>` elements keyed by `delivery.id` (React's
 * `key={d.id}`): a stable record per id keeps a row's DOM node while its id is
 * unchanged, so a re-passed equal list does not re-create the rows.
 * `onSelect` fires on EVERY toggle — opening and closing alike.
 *
 * @param props - Component props (see {@link WebhookInspectorProps}).
 * @returns The rendered webhook inspector.
 */
export const WebhookInspector: Component<WebhookInspectorProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  /** Stable base for the per-delivery ids this render mints (React's `useId`). */
  const idPrefix = createUniqueId()

  /** One stable record per delivery id, so `<For>` keys rows by id like React. */
  const records = new Map<string, { id: string }>()

  /**
   * The current rows, each a stable record for its delivery id.
   *
   * @returns One record per delivery, in order.
   */
  const keyedRows = (): { id: string }[] => {
    const seen = new Set<string>()
    const rows = (props.deliveries ?? []).map((delivery) => {
      seen.add(delivery.id)
      let row = records.get(delivery.id)
      if (!row) {
        row = { id: delivery.id }
        records.set(delivery.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }

  /**
   * The current delivery for a row id.
   *
   * @param id - The delivery id.
   * @returns The delivery.
   */
  const deliveryFor = (id: string): WebhookDelivery =>
    (props.deliveries ?? []).find((delivery) => delivery.id === id)!

  /**
   * One delivery's row: the `<details>` and, beside it on a failed delivery
   * with `onRetry`, the retry button.
   *
   * The button is a SIBLING of the `<details>`, never inside the `<summary>`:
   * a button nested in the disclosure's own toggle control is
   * `nested-interactive` — unreachable for assistive technology — so it
   * describes itself through the row's event-type span instead.
   *
   * @param row - The stable record for the delivery.
   * @param index - The delivery's index (React mints the id from it too).
   * @returns The row.
   */
  const row = (row: { id: string }, index: () => number): JSX.Element => {
    const delivery = (): WebhookDelivery => deliveryFor(row.id)
    /** Names the event-type span so the retry button can describe itself by it. */
    const eventTypeId = (): string => `${idPrefix}-event-${index()}`
    const retryable = (): boolean => Boolean(props.onRetry) && delivery().status === 'failure'
    return (
      <div class={cm.flex({ align: 'start', gap: 'sm' })}>
        <details
          class={cm.cn(cm.flex1)}
          open={delivery().id === props.selectedId}
          onToggle={(): void => props.onSelect?.(delivery())}
        >
          <summary
            class={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('py', 1),
              cm.sp('px', 2),
              cm.textSize('xs'),
              cm.cursorPointer,
            )}
          >
            <span style={{ width: '80px', opacity: '0.7' }}>{delivery().timestamp}</span>
            <span
              class={cm.cn(cm.bgTone(statusTone(delivery().status)), cm.textOnTone)}
              style={{
                'min-width': '70px',
                'text-align': 'center',
                padding: '0px 6px',
                'border-radius': '4px',
                'font-weight': '700',
              }}
            >
              {delivery().statusCode}
            </span>
            <span
              id={retryable() ? eventTypeId() : undefined}
              class={cm.cn(cm.fontWeight('semibold'), cm.flex1)}
            >
              {delivery().eventType}
            </span>
            {delivery().attempt !== undefined ? <span>{`#${delivery().attempt}`}</span> : null}
            {delivery().durationMs !== undefined ? (
              <span>{`${delivery().durationMs}ms`}</span>
            ) : null}
          </summary>
          <div class={cm.cn(cm.sp('p', 3), cm.stack(2))}>
            <Show when={delivery().requestBody !== undefined}>
              <div class={cm.stack(1)}>
                <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                  {t('webhookInspector.request', undefined, { defaultValue: 'Request' })}
                </span>
                <pre class={cm.textSize('xs')} style={{ 'overflow-x': 'auto' }}>
                  {/* React renders `{''}` as no text node at all. */}
                  <Show when={stringify(delivery().requestBody) !== ''}>
                    {stringify(delivery().requestBody)}
                  </Show>
                </pre>
              </div>
            </Show>
            <Show when={delivery().responseBody !== undefined}>
              <div class={cm.stack(1)}>
                <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                  {t('webhookInspector.response', undefined, { defaultValue: 'Response' })}
                </span>
                <pre class={cm.textSize('xs')} style={{ 'overflow-x': 'auto' }}>
                  <Show when={stringify(delivery().responseBody) !== ''}>
                    {stringify(delivery().responseBody)}
                  </Show>
                </pre>
              </div>
            </Show>
          </div>
        </details>
        <Show when={retryable()}>
          <span class={cm.sp('py', 1)}>
            <button
              type="button"
              data-mol-id="webhook-inspector-retry"
              class={cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                cm.touchTargetCompact,
              )}
              aria-describedby={eventTypeId()}
              onClick={(): void => props.onRetry?.(delivery())}
            >
              {t('webhookInspector.retry', undefined, { defaultValue: 'Retry' })}
            </button>
          </span>
        </Show>
      </div>
    )
  }

  return (
    <div class={cm.cn(cm.stack(1), props.className)}>
      <For each={keyedRows()}>{(record, index) => row(record, index)}</For>
    </div>
  )
}

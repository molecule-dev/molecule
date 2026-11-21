/**
 * Vue webhook delivery-log inspector: one `<details>` row per delivery with a
 * colored status-code badge, event type, optional attempt/duration and a retry
 * button on failed rows, expanding to the request and response JSON panels.
 *
 * Vue counterpart of `@molecule/app-webhook-inspector-react`'s
 * `WebhookInspector` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { WebhookDelivery } from './types.js'

/**
 * The children React renders for one node value: nothing for `undefined`,
 * `null`, a boolean or the empty string, the value itself otherwise.
 *
 * @param value - The node value.
 * @returns The children to render.
 */
const nodeChildren = (value: VNodeChild): VNodeChild[] =>
  value === undefined || value === null || typeof value === 'boolean' || value === '' ? [] : [value]

/**
 * The children React renders for a body's text: nothing for the empty string
 * (React renders `{''}` as no text node at all), the text otherwise.
 *
 * @param text - The body text.
 * @returns The children to render.
 */
const textChildren = (text: string): VNodeChild[] => (text === '' ? [] : [text])

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
 * `key={d.id}`), so a re-passed equal list keeps the rows' DOM nodes, and
 * `onSelect` fires on EVERY toggle — opening and closing alike.
 *
 * @param props - Component props (see the `WebhookInspectorProps` type in `./types.js`).
 * @returns The webhook inspector component.
 */
export const WebhookInspector = defineComponent({
  name: 'WebhookInspector',
  props: {
    deliveries: {
      type: Array as PropType<WebhookDelivery[]>,
      required: true,
    },
    onRetry: {
      type: Function as PropType<(delivery: WebhookDelivery) => void>,
      default: undefined,
    },
    onSelect: {
      type: Function as PropType<(delivery: WebhookDelivery) => void>,
      default: undefined,
    },
    selectedId: { type: String, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    /** Stable base for the per-delivery ids this render mints (React's `useId`). */
    const idPrefix = useId()

    /**
     * One delivery's row: the `<details>` and, beside it on a failed delivery
     * with `onRetry`, the retry button.
     *
     * The button is a SIBLING of the `<details>`, never inside the
     * `<summary>`: a button nested in the disclosure's own toggle control is
     * `nested-interactive` — unreachable for assistive technology — so it
     * describes itself through the row's event-type span instead.
     *
     * @param delivery - The delivery.
     * @param index - The delivery's index (React mints the id from it too).
     * @returns The row.
     */
    const row = (delivery: WebhookDelivery, index: number): VNode => {
      const selected = delivery.id === props.selectedId
      /** Names the event-type span so the retry button can describe itself by it. */
      const eventTypeId = `${idPrefix}-event-${index}`
      const retryable = Boolean(props.onRetry) && delivery.status === 'failure'
      return h(
        'div',
        {
          key: delivery.id,
          class: cm.flex({ align: 'start', gap: 'sm' }),
        },
        [
          h(
            'details',
            {
              class: cm.cn(cm.flex1),
              open: selected,
              onToggle: (): void => props.onSelect?.(delivery),
            },
            [
              h(
                'summary',
                {
                  class: cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('py', 1),
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.cursorPointer,
                  ),
                },
                [
                  h(
                    'span',
                    { style: { width: '80px', opacity: '0.7' } },
                    nodeChildren(delivery.timestamp),
                  ),
                  h(
                    'span',
                    {
                      class: cm.cn(cm.bgTone(statusTone(delivery.status)), cm.textOnTone),
                      style: {
                        minWidth: '70px',
                        textAlign: 'center',
                        padding: '0px 6px',
                        borderRadius: '4px',
                        fontWeight: '700',
                      },
                    },
                    [delivery.statusCode],
                  ),
                  h(
                    'span',
                    {
                      id: retryable ? eventTypeId : undefined,
                      class: cm.cn(cm.fontWeight('semibold'), cm.flex1),
                    },
                    [delivery.eventType],
                  ),
                  delivery.attempt !== undefined ? h('span', null, [`#${delivery.attempt}`]) : null,
                  delivery.durationMs !== undefined
                    ? h('span', null, [`${delivery.durationMs}ms`])
                    : null,
                ],
              ),
              h('div', { class: cm.cn(cm.sp('p', 3), cm.stack(2)) }, [
                delivery.requestBody !== undefined
                  ? h('div', { class: cm.stack(1) }, [
                      h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
                        t('webhookInspector.request', undefined, { defaultValue: 'Request' }),
                      ]),
                      h('pre', { class: cm.textSize('xs'), style: { overflowX: 'auto' } }, [
                        ...textChildren(stringify(delivery.requestBody)),
                      ]),
                    ])
                  : null,
                delivery.responseBody !== undefined
                  ? h('div', { class: cm.stack(1) }, [
                      h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
                        t('webhookInspector.response', undefined, { defaultValue: 'Response' }),
                      ]),
                      h('pre', { class: cm.textSize('xs'), style: { overflowX: 'auto' } }, [
                        ...textChildren(stringify(delivery.responseBody)),
                      ]),
                    ])
                  : null,
              ]),
            ],
          ),
          retryable
            ? h('span', { class: cm.sp('py', 1) }, [
                h(
                  'button',
                  {
                    type: 'button',
                    'data-mol-id': 'webhook-inspector-retry',
                    class: cm.cn(
                      cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                      cm.touchTargetCompact,
                    ),
                    'aria-describedby': eventTypeId,
                    onClick: (): void => props.onRetry?.(delivery),
                  },
                  [t('webhookInspector.retry', undefined, { defaultValue: 'Retry' })],
                ),
              ])
            : null,
        ],
      )
    }

    return (): VNode =>
      h('div', { class: cm.cn(cm.stack(1), props.className) }, props.deliveries.map(row))
  },
})

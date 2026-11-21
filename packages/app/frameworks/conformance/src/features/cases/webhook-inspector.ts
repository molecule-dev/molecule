/**
 * `@molecule/app-webhook-inspector-react` cases: the webhook delivery log —
 * each delivery is a wrapper `<div>` holding a `<details>` row (timestamp +
 * themed status-code badge + event type + optional attempt/duration) that
 * expands to the request and response JSON panels, with the retry button for
 * a failed delivery beside the row (a sibling of the `<details>`, so it is
 * never nested in the disclosure's own toggle control), the selected-row
 * branch (`selectedId` opens that row), the `onSelect`/`onRetry` callbacks, and
 * the `webhookInspector.*` labels following a locale switch.
 *
 * `WebhookInspector` is the package's only runtime export (`WebhookDelivery`
 * and `WebhookInspectorProps` are types). The status badge takes the theme's
 * semantic tone (success / error / warning) through the ClassMap; rows are
 * native `<details>` elements, so a click on the `<summary>` toggles the row
 * and `onSelect` fires on EVERY toggle — opening and closing alike. A failed
 * delivery's retry button names its delivery through `aria-describedby` on the
 * row's event-type span.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A successful delivery with both bodies and a duration. */
const succeeded = {
  id: '1',
  eventType: 'payment.succeeded',
  timestamp: '10:00',
  statusCode: 200,
  status: 'success',
  durationMs: 120,
  requestBody: { amount: 5000, currency: 'usd' },
  responseBody: 'ok',
}

/** A failed delivery: an attempt number and no bodies. */
const failed = {
  id: '2',
  eventType: 'payment.failed',
  timestamp: '10:05',
  statusCode: 500,
  status: 'failure',
  attempt: 2,
}

/** A pending delivery. */
const pending = {
  id: '3',
  eventType: 'invoice.pending',
  timestamp: '10:07',
  statusCode: 202,
  status: 'pending',
}

/** A delivery carrying none of the optional fields. */
const minimal = {
  id: 'min',
  eventType: 'ping',
  timestamp: '00:00',
  statusCode: 204,
  status: 'success',
}

/** `@molecule/app-webhook-inspector-react`. */
export const webhookInspectorFeature: FeatureCases = {
  package: '@molecule/app-webhook-inspector-react',
  families: [
    {
      component: 'WebhookInspector',
      keyedLists: [{ prop: 'deliveries', selector: 'details', caseName: 'two deliveries' }],
      cases: [
        { name: 'no deliveries', props: { deliveries: [] } },
        { name: 'one successful delivery', props: { deliveries: [succeeded] } },
        { name: 'one failed delivery', props: { deliveries: [failed] } },
        { name: 'two deliveries', props: { deliveries: [succeeded, failed] } },
        { name: 'every status', props: { deliveries: [succeeded, failed, pending] } },
        { name: 'a delivery with no optional fields', props: { deliveries: [minimal] } },
        {
          name: 'a zero attempt and duration still render',
          props: { deliveries: [{ ...minimal, attempt: 0, durationMs: 0 }] },
        },
        {
          name: 'an attempt without a duration',
          props: { deliveries: [{ ...minimal, attempt: 3 }] },
        },
        {
          name: 'a duration without an attempt',
          props: { deliveries: [{ ...minimal, durationMs: 7 }] },
        },
        {
          name: 'className passthrough',
          props: { deliveries: [succeeded], className: 'parity-token' },
        },
        {
          name: 'a node-valued timestamp',
          props: {
            deliveries: [
              { ...minimal, timestamp: { $nodes: [{ tag: 'em', children: ['10:03'] }] } },
            ],
          },
        },
        { name: 'a number timestamp', props: { deliveries: [{ ...minimal, timestamp: 42 }] } },
        {
          name: 'an empty-string timestamp renders nothing',
          props: { deliveries: [{ ...minimal, timestamp: '' }] },
        },
        {
          name: 'a string request body',
          props: { deliveries: [{ ...minimal, requestBody: 'raw text payload' }] },
        },
        {
          name: 'a multiline string request body',
          props: { deliveries: [{ ...minimal, requestBody: 'line one\nline two' }] },
        },
        {
          name: 'an object request body',
          props: {
            deliveries: [
              { ...minimal, requestBody: { nested: { a: 1 }, list: [1, 2], flag: false } },
            ],
          },
        },
        {
          name: 'an object response body',
          props: { deliveries: [{ ...minimal, responseBody: { ok: true, id: 'evt_1' } }] },
        },
        {
          name: 'an array response body',
          props: { deliveries: [{ ...minimal, responseBody: [1, 'two', { three: 3 }] }] },
        },
        {
          name: 'both bodies',
          props: {
            deliveries: [{ ...minimal, requestBody: { a: 1 }, responseBody: { b: 2 } }],
          },
        },
        {
          name: 'a null request body',
          props: { deliveries: [{ ...minimal, requestBody: null }] },
        },
        {
          name: 'a false response body',
          props: { deliveries: [{ ...minimal, responseBody: false }] },
        },
        {
          name: 'a zero response body',
          props: { deliveries: [{ ...minimal, responseBody: 0 }] },
        },
        {
          name: 'an empty-string request body renders an empty panel',
          props: { deliveries: [{ ...minimal, requestBody: '' }] },
        },
        {
          name: 'the selected delivery opens',
          props: { deliveries: [succeeded, failed], selectedId: '1' },
        },
        {
          name: 'a selected id that matches nothing opens nothing',
          props: { deliveries: [succeeded, failed], selectedId: 'missing' },
        },
        {
          name: 'clicking a summary calls onSelect',
          props: { deliveries: [succeeded] },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: 'summary' }],
        },
        {
          name: 'clicking a summary twice calls onSelect for both toggles',
          props: { deliveries: [succeeded] },
          callbacks: ['onSelect'],
          interactions: [
            { type: 'click', selector: 'summary' },
            { type: 'click', selector: 'summary' },
          ],
        },
        {
          name: 'clicking a second row leaves the first closed',
          props: { deliveries: [succeeded, failed] },
          callbacks: ['onSelect'],
          // Each delivery is a wrapper `<div>` holding the `<details>` and, on a
          // failed row, the retry button beside it, so the second row's
          // summary is reached through its wrapper.
          interactions: [{ type: 'click', selector: 'div:nth-of-type(2) > details > summary' }],
        },
        {
          name: 'clicking the selected summary collapses it',
          props: { deliveries: [succeeded, failed], selectedId: '1' },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: 'details:nth-of-type(1) > summary' }],
        },
        {
          name: 'clicking the retry button calls onRetry',
          props: { deliveries: [succeeded, failed] },
          callbacks: ['onRetry', 'onSelect'],
          interactions: [{ type: 'click', selector: '[data-mol-id="webhook-inspector-retry"]' }],
        },
        {
          name: 'clicking the retry button does not select the row',
          props: { deliveries: [failed] },
          callbacks: ['onRetry', 'onSelect'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="webhook-inspector-retry"]' },
            { type: 'click', selector: 'summary' },
          ],
        },
        {
          name: 'no retry button without onRetry',
          props: { deliveries: [succeeded, failed, pending] },
        },
        {
          name: 'no retry button on a non-failure delivery',
          props: { deliveries: [succeeded, pending], onRetry: { $callback: 'onRetry' } },
          callbacks: ['onRetry'],
        },
        {
          name: 'a props change selects a delivery',
          props: { deliveries: [succeeded, failed] },
          interactions: [{ type: 'props', props: { selectedId: '2' } }],
        },
        {
          name: 'a props change clears the selection',
          props: { deliveries: [succeeded, failed], selectedId: '1' },
          interactions: [{ type: 'props', props: { selectedId: undefined } }],
        },
        {
          name: 'a props change moves the selection',
          props: { deliveries: [succeeded, failed], selectedId: '1' },
          interactions: [{ type: 'props', props: { selectedId: '2' } }],
        },
        {
          name: 'a props change replaces the deliveries',
          props: { deliveries: [succeeded] },
          interactions: [{ type: 'props', props: { deliveries: [failed, pending] } }],
        },
        {
          name: 'a props change adds a delivery',
          props: { deliveries: [succeeded] },
          interactions: [{ type: 'props', props: { deliveries: [succeeded, failed] } }],
        },
        {
          name: 'a props change empties the list',
          props: { deliveries: [succeeded] },
          interactions: [{ type: 'props', props: { deliveries: [] } }],
        },
        {
          name: 'a props change removes the retry button',
          props: { deliveries: [failed] },
          callbacks: ['onRetry', 'onSelect'],
          interactions: [
            { type: 'props', props: { deliveries: [{ ...failed, status: 'success' }] } },
          ],
        },
        {
          name: 'a props change updates a request body',
          props: { deliveries: [{ ...minimal, requestBody: { a: 1 } }] },
          interactions: [
            { type: 'props', props: { deliveries: [{ ...minimal, requestBody: { a: 2 } }] } },
          ],
        },
        {
          name: 'className changes',
          props: { deliveries: [failed] },
          interactions: [{ type: 'props', props: { className: 'parity-token' } }],
        },
        {
          name: 'labels follow a locale switch',
          props: { deliveries: [{ ...failed, requestBody: { a: 1 } }] },
          context: {
            translations: {
              'en-XA': {
                webhookInspector: {
                  retry: 'Réessayer',
                  request: 'Requête',
                  response: 'Réponse',
                },
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
  ],
}

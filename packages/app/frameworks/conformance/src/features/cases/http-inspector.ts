/**
 * `@molecule/app-http-inspector-react` cases: the controlled HTTP request
 * builder — method selector + URL + Send, the header key/value editor, the
 * body editor (rendered only for methods that allow a body), and the response
 * panel (status-severity inline colors, timing, body). Covers every method,
 * the optional props, the change/send callbacks, prop changes and the
 * `httpInspector.*` labels following a locale switch.
 *
 * `HttpInspector` is the package's only runtime export (`HttpMethod`,
 * `HttpHeader`, `HttpResponse` and `HttpInspectorProps` are types).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const url = 'https://api.example.com/v1/resources'

/** Two header entries, the shape an app owns and passes in. */
const headers = [
  { key: 'Accept', value: 'application/json' },
  { key: 'X-Trace', value: 'trace-1' },
]

/** A complete response: status text, duration and a JSON body. */
const okResponse = { statusCode: 200, statusText: 'OK', durationMs: 42, body: '{"ok":true}' }

/** `@molecule/app-http-inspector-react`. */
export const httpInspectorFeature: FeatureCases = {
  package: '@molecule/app-http-inspector-react',
  families: [
    {
      component: 'HttpInspector',
      cases: [
        {
          name: 'GET defaults: no headers, no body editor, no response',
          props: { method: 'GET', url, headers: [], body: '' },
        },
        {
          name: 'POST with headers, a body, a response and className',
          props: {
            method: 'POST',
            url: 'https://api.example.com/v1/users',
            headers,
            body: '{"name":"Ada"}',
            response: {
              statusCode: 201,
              statusText: 'Created',
              durationMs: 42,
              body: '{"id":"u1"}',
            },
            className: 'parity-token',
          },
        },
        {
          name: 'sending disables Send and shows the pending label',
          props: {
            method: 'POST',
            url,
            headers: [],
            body: '{}',
            sending: true,
            response: okResponse,
          },
        },
        {
          name: 'explicitly not sending renders the idle label',
          props: { method: 'POST', url, headers: [], body: '', sending: false },
        },
        {
          name: 'PUT with an empty response body and no status text or duration',
          props: {
            method: 'PUT',
            url,
            headers: [],
            body: '',
            response: { statusCode: 204, body: '' },
          },
        },
        {
          name: 'HEAD hides the body editor even with body text',
          props: { method: 'HEAD', url, headers, body: 'ignored body' },
        },
        {
          name: 'PATCH renders the body editor',
          props: { method: 'PATCH', url, headers: [], body: '{"a":1}' },
        },
        {
          name: 'DELETE with a null response',
          props: { method: 'DELETE', url, headers, body: '', response: null },
        },
        {
          name: 'OPTIONS with a redirect response and no duration',
          props: {
            method: 'OPTIONS',
            url,
            headers: [],
            body: '',
            response: { statusCode: 302, statusText: 'Found', body: 'moved' },
          },
        },
        {
          name: 'a zero duration renders',
          props: {
            method: 'GET',
            url,
            headers: [],
            body: '',
            response: { statusCode: 200, durationMs: 0, body: '[]' },
          },
        },
        {
          name: 'the status badge colors by status class',
          props: {
            method: 'GET',
            url,
            headers: [],
            body: '',
            response: { statusCode: 204, body: '' },
          },
          interactions: [
            { type: 'props', props: { response: { statusCode: 302, body: '' } } },
            { type: 'props', props: { response: { statusCode: 404, body: '' } } },
            { type: 'props', props: { response: { statusCode: 500, body: '' } } },
          ],
        },
        {
          name: 'editing the request calls the change handlers',
          props: {
            method: 'POST',
            url,
            headers: [{ key: 'Accept', value: 'application/json' }],
            body: '',
          },
          callbacks: ['onMethodChange', 'onUrlChange', 'onHeadersChange', 'onBodyChange', 'onSend'],
          interactions: [
            {
              type: 'input',
              selector: 'input[aria-label="URL"]',
              value: 'https://api.example.com/v2',
            },
            { type: 'input', selector: 'input[placeholder="Header"]', value: 'X-Trace' },
            { type: 'input', selector: 'input[placeholder="Value"]', value: 'trace-2' },
            {
              type: 'input',
              selector: 'select[aria-label="HTTP method"]',
              value: 'DELETE',
            },
            { type: 'input', selector: 'textarea', value: '{"a":1}' },
            { type: 'click', selector: 'div:has(select[aria-label="HTTP method"]) > button' },
            { type: 'click', selector: 'div:has(> span) > button' },
            { type: 'click', selector: 'div:has(input[placeholder="Value"]) > button' },
          ],
        },
        {
          name: 'adding and removing headers calls onHeadersChange',
          props: { method: 'GET', url, headers, body: '' },
          callbacks: ['onHeadersChange'],
          interactions: [
            { type: 'click', selector: 'div:has(> span) > button' },
            { type: 'click', selector: 'div:has(input[placeholder="Value"]) > button' },
          ],
        },
        {
          name: 'changing the method prop shows and hides the body editor',
          props: { method: 'GET', url, headers: [], body: '{}' },
          interactions: [
            { type: 'props', props: { method: 'POST' } },
            { type: 'props', props: { method: 'HEAD' } },
            { type: 'props', props: { method: 'GET' } },
          ],
        },
        {
          name: 'a response arrives after a prop change',
          props: { method: 'GET', url, headers: [], body: '', response: null },
          interactions: [
            {
              type: 'props',
              props: { response: { statusCode: 200, statusText: 'OK', durationMs: 7, body: '[]' } },
            },
            { type: 'props', props: { response: undefined } },
          ],
        },
        {
          name: 'the sending prop changes the label back and forth',
          props: { method: 'POST', url, headers: [], body: '' },
          interactions: [
            { type: 'props', props: { sending: true } },
            { type: 'props', props: { sending: false } },
          ],
        },
        {
          name: 'labels follow a locale switch',
          props: { method: 'POST', url, headers, body: '{}', sending: true },
          context: {
            translations: {
              'en-XA': {
                httpInspector: {
                  headers: 'En-têtes',
                  body: 'Corps',
                  addHeader: 'Ajouter un en-tête',
                  send: 'Envoyer',
                  sending: 'Envoi…',
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

/**
 * Vue HTTP request builder + response inspector.
 *
 * Vue counterpart of `@molecule/app-http-inspector-react`'s `HttpInspector` —
 * the same props (React names), the same ClassMap tokens and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select, Textarea } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { HttpHeader, HttpMethod, HttpResponse } from './types.js'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

/**
 * Returns the semantic tone representing the severity of an HTTP status code:
 * the theme's success green below 300, info blue for a redirect, warning amber
 * for a client error, error red for a server error.
 *
 * @param code - The response status code.
 * @returns The badge's semantic tone.
 */
function statusTone(code: number): ColorVariant {
  if (code < 300) return 'success'
  if (code < 400) return 'info'
  if (code < 500) return 'warning'
  return 'error'
}

/**
 * The children React renders for a body's text: nothing for the empty string
 * (React renders `{''}` as no text node at all), the text otherwise.
 *
 * @param text - The body text.
 * @returns The children to render.
 */
const textChildren = (text: string): VNodeChild[] => (text === '' ? [] : [text])

/**
 * Controlled HTTP request builder + response panel. App owns request state +
 * the actual `fetch`; this component renders the UI.
 *
 * Shape: method + URL row, headers key/value editor, body textarea, Send
 * button, then a response panel showing status + timing + body.
 *
 * @param props - Component props (see the `HttpInspectorProps` type in `./types.js`).
 * @returns The HTTP inspector component.
 */
export const HttpInspector = defineComponent({
  name: 'HttpInspector',
  props: {
    method: {
      type: String as PropType<HttpMethod>,
      required: true,
    },
    onMethodChange: {
      type: Function as PropType<(method: HttpMethod) => void>,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    onUrlChange: {
      type: Function as PropType<(url: string) => void>,
      required: true,
    },
    headers: {
      type: Array as PropType<HttpHeader[]>,
      required: true,
    },
    onHeadersChange: {
      type: Function as PropType<(headers: HttpHeader[]) => void>,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    onBodyChange: {
      type: Function as PropType<(body: string) => void>,
      required: true,
    },
    onSend: {
      type: Function as PropType<() => void | Promise<void>>,
      required: true,
    },
    sending: {
      type: Boolean,
      default: undefined,
    },
    response: {
      type: Object as PropType<HttpResponse | null>,
      default: undefined,
    },
    className: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const { t } = useTranslation()

    /**
     * Updates a single header entry at index i with new key and value.
     *
     * @param i - The row index.
     * @param key - The new header key.
     * @param value - The new header value.
     */
    function setHeader(i: number, key: string, value: string): void {
      const next = [...props.headers]
      next[i] = { key, value }
      props.onHeadersChange(next)
    }

    return (): VNode => {
      const cm = getClassMap()
      const response = props.response
      const children: VNodeChild[] = [
        h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
          // The options are protocol tokens (GET, POST, …): never translated,
          // so the element carries HTML's own `translate="no"`.
          h(Select, {
            value: props.method,
            onValueChange: (value: string) => props.onMethodChange(value as HttpMethod),
            options: METHODS.map((method) => ({ value: method, label: method })),
            translate: 'no',
            'aria-label': t('httpInspector.methodLabel', {}, { defaultValue: 'HTTP method' }),
          }),
          // The placeholder is an example URL — input, not prose: never translated.
          h(Input, {
            type: 'text',
            value: props.url,
            onChange: (event: Event) => props.onUrlChange((event.target as HTMLInputElement).value),
            placeholder: 'https://api.example.com/v1/resources',
            translate: 'no',
            className: cm.flex1,
            'aria-label': t('httpInspector.urlLabel', {}, { defaultValue: 'URL' }),
          }),
          h(
            Button,
            {
              variant: 'solid',
              color: 'primary',
              onClick: () => void props.onSend(),
              disabled: props.sending,
            },
            () => [
              props.sending
                ? t('httpInspector.sending', {}, { defaultValue: 'Sending…' })
                : t('httpInspector.send', {}, { defaultValue: 'Send' }),
            ],
          ),
        ]),
        h('div', { class: cm.stack(1 as const) }, [
          h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
            t('httpInspector.headers', {}, { defaultValue: 'Headers' }),
          ]),
          ...props.headers.map((header, i) =>
            h('div', { key: i, class: cm.flex({ align: 'center', gap: 'xs' }) }, [
              h(Input, {
                type: 'text',
                value: header.key,
                onChange: (event: Event) =>
                  setHeader(i, (event.target as HTMLInputElement).value, header.value),
                placeholder: t('httpInspector.headerPlaceholder', {}, { defaultValue: 'Header' }),
              }),
              h(Input, {
                type: 'text',
                value: header.value,
                onChange: (event: Event) =>
                  setHeader(i, header.key, (event.target as HTMLInputElement).value),
                placeholder: t('httpInspector.valuePlaceholder', {}, { defaultValue: 'Value' }),
                className: cm.flex1,
              }),
              h(
                Button,
                {
                  variant: 'ghost',
                  size: 'sm',
                  onClick: () => props.onHeadersChange(props.headers.filter((_, j) => j !== i)),
                },
                () => ['×'],
              ),
            ]),
          ),
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: () => props.onHeadersChange([...props.headers, { key: '', value: '' }]),
            },
            () => ['+ ', t('httpInspector.addHeader', {}, { defaultValue: 'Add header' })],
          ),
        ]),
      ]
      if (props.method !== 'GET' && props.method !== 'HEAD') {
        children.push(
          h('div', { class: cm.stack(1 as const) }, [
            h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
              t('httpInspector.body', {}, { defaultValue: 'Body' }),
            ]),
            // The placeholder is a JSON example — input, not prose: never translated.
            h(Textarea, {
              value: props.body,
              onChange: (event: Event) =>
                props.onBodyChange((event.target as HTMLTextAreaElement).value),
              rows: 6,
              placeholder: '{"key": "value"}',
              translate: 'no',
            }),
          ]),
        )
      }
      if (response) {
        children.push(
          h('div', { class: cm.stack(2) }, [
            h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
              h(
                'span',
                {
                  class: cm.cn(cm.bgTone(statusTone(response.statusCode)), cm.textOnTone),
                  style: {
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: '700',
                  },
                },
                [String(response.statusCode), ' ', response.statusText ?? ''],
              ),
              response.durationMs !== undefined
                ? h('span', { class: cm.textSize('xs') }, [`${response.durationMs}ms`])
                : null,
            ]),
            h(
              'pre',
              {
                class: cm.cn(cm.sp('p', 3), cm.textSize('xs')),
                style: { overflowX: 'auto' },
              },
              textChildren(response.body),
            ),
          ]),
        )
      }
      return h('div', { class: cm.cn(cm.stack(3), props.className) }, children)
    }
  },
})

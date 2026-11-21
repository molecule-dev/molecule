/**
 * Solid HTTP request builder + response inspector.
 *
 * Solid counterpart of `@molecule/app-http-inspector-react`'s `HttpInspector` —
 * the same props (React names), the same ClassMap tokens and the same DOM for
 * the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select, Textarea } from '@molecule/app-ui-solid'

import type { HttpHeader, HttpInspectorProps, HttpMethod } from './types.js'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

/**
 * HTML's own marker for text that stays as written in every language — a
 * protocol token, an example URL. The UI components forward it through their
 * rest props onto the native element; it covers the element's text and its
 * placeholder, so a translator (machine or human) never touches them.
 */
const NOT_TRANSLATED = { translate: 'no' } as const

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
 * Controlled HTTP request builder + response panel. App owns request state +
 * the actual `fetch`; this component renders the UI.
 *
 * Shape: method + URL row, headers key/value editor, body textarea, Send
 * button, then a response panel showing status + timing + body.
 *
 * @param props - Component props (see {@link HttpInspectorProps}).
 * @returns The rendered HTTP inspector.
 */
export const HttpInspector: Component<HttpInspectorProps> = (props) => {
  const cm = getClassMap()
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

  return (
    <div class={cm.cn(cm.stack(3), props.className)}>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {/* The options are protocol tokens (GET, POST, …): never translated,
            so the element carries HTML's own `translate="no"`. */}
        <Select
          {...NOT_TRANSLATED}
          value={props.method}
          onValueChange={(value: string) => props.onMethodChange(value as HttpMethod)}
          options={METHODS.map((method) => ({ value: method, label: method }))}
          aria-label={t('httpInspector.methodLabel', {}, { defaultValue: 'HTTP method' })}
        />
        {/* The placeholder is an example URL — input, not prose: never translated. */}
        <Input
          {...NOT_TRANSLATED}
          type="text"
          value={props.url}
          onChange={(event) => props.onUrlChange((event.target as HTMLInputElement).value)}
          placeholder="https://api.example.com/v1/resources"
          className={cm.flex1}
          aria-label={t('httpInspector.urlLabel', {}, { defaultValue: 'URL' })}
        />
        <Button
          variant="solid"
          color="primary"
          onClick={() => void props.onSend()}
          disabled={props.sending}
        >
          {props.sending
            ? t('httpInspector.sending', {}, { defaultValue: 'Sending…' })
            : t('httpInspector.send', {}, { defaultValue: 'Send' })}
        </Button>
      </div>
      <div class={cm.stack(1 as const)}>
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {t('httpInspector.headers', {}, { defaultValue: 'Headers' })}
        </span>
        {props.headers.map((header: HttpHeader, i: number) => (
          <div class={cm.flex({ align: 'center', gap: 'xs' })}>
            <Input
              type="text"
              value={header.key}
              onChange={(event) =>
                setHeader(i, (event.target as HTMLInputElement).value, header.value)
              }
              placeholder={t('httpInspector.headerPlaceholder', {}, { defaultValue: 'Header' })}
            />
            <Input
              type="text"
              value={header.value}
              onChange={(event) =>
                setHeader(i, header.key, (event.target as HTMLInputElement).value)
              }
              placeholder={t('httpInspector.valuePlaceholder', {}, { defaultValue: 'Value' })}
              className={cm.flex1}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => props.onHeadersChange(props.headers.filter((_, j) => j !== i))}
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => props.onHeadersChange([...props.headers, { key: '', value: '' }])}
        >
          + {t('httpInspector.addHeader', {}, { defaultValue: 'Add header' })}
        </Button>
      </div>
      <Show when={props.method !== 'GET' && props.method !== 'HEAD'}>
        <div class={cm.stack(1 as const)}>
          <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
            {t('httpInspector.body', {}, { defaultValue: 'Body' })}
          </span>
          {/* The placeholder is a JSON example — input, not prose: never translated. */}
          <Textarea
            {...NOT_TRANSLATED}
            value={props.body}
            onChange={(event) => props.onBodyChange((event.target as HTMLTextAreaElement).value)}
            rows={6}
            placeholder='{"key": "value"}'
          />
        </div>
      </Show>
      <Show when={props.response}>
        <div class={cm.stack(2)}>
          <div class={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              class={cm.cn(cm.bgTone(statusTone(props.response!.statusCode)), cm.textOnTone)}
              style={{
                padding: '2px 8px',
                'border-radius': '4px',
                'font-weight': '700',
              }}
            >
              {props.response!.statusCode} {props.response!.statusText ?? ''}
            </span>
            <Show when={props.response!.durationMs !== undefined}>
              <span class={cm.textSize('xs')}>{props.response!.durationMs}ms</span>
            </Show>
          </div>
          <pre class={cm.cn(cm.sp('p', 3), cm.textSize('xs'))} style={{ 'overflow-x': 'auto' }}>
            {props.response!.body === '' ? undefined : props.response!.body}
          </pre>
        </div>
      </Show>
    </div>
  )
}

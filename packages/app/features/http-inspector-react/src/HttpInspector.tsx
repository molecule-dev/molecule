import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select, Textarea } from '@molecule/app-ui-react'

/** HTTP method verb for a request. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
/** A single HTTP request or response header key/value pair. */
export interface HttpHeader {
  key: string
  value: string
}
/** Parsed HTTP response returned after a request completes. */
export interface HttpResponse {
  statusCode: number
  statusText?: string
  durationMs?: number
  body: string
  headers?: HttpHeader[]
}

/** Props for {@link HttpInspector}. */
export interface HttpInspectorProps {
  method: HttpMethod
  onMethodChange: (m: HttpMethod) => void
  url: string
  onUrlChange: (u: string) => void
  headers: HttpHeader[]
  onHeadersChange: (h: HttpHeader[]) => void
  body: string
  onBodyChange: (b: string) => void
  onSend: () => void | Promise<void>
  sending?: boolean
  response?: HttpResponse | null
  className?: string
}

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
 * @param code
 */
function statusTone(code: number): ColorVariant {
  if (code < 300) return 'success'
  if (code < 400) return 'info'
  if (code < 500) return 'warning'
  return 'error'
}

/**
 * Controlled HTTP request builder + response panel. App owns request
 * state + the actual `fetch`; this component renders the UI.
 *
 * Shape: method + URL row, headers key/value editor, body textarea,
 * Send button, then a response panel showing status + timing + body.
 * @param props - Component props (see {@link HttpInspectorProps}).
 */
export function HttpInspector({
  method,
  onMethodChange,
  url,
  onUrlChange,
  headers,
  onHeadersChange,
  body,
  onBodyChange,
  onSend,
  sending,
  response,
  className,
}: HttpInspectorProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  /**
   * Updates a single header entry at index i with new key and value.
   * @param i
   * @param key
   * @param value
   */
  function setHeader(i: number, key: string, value: string): void {
    const next = [...headers]
    next[i] = { key, value }
    onHeadersChange(next)
  }
  return (
    <div className={cm.cn(cm.stack(3), className)}>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {/* The options are protocol tokens (GET, POST, …): never translated,
            so the element carries HTML's own `translate="no"`. */}
        <Select
          {...NOT_TRANSLATED}
          value={method}
          onValueChange={(v) => onMethodChange(v as HttpMethod)}
          options={METHODS.map((m) => ({ value: m, label: m }))}
          aria-label={t('httpInspector.methodLabel', {}, { defaultValue: 'HTTP method' })}
        />
        {/* The placeholder is an example URL — input, not prose: never translated. */}
        <Input
          {...NOT_TRANSLATED}
          type="text"
          value={url}
          onChange={(e) => onUrlChange((e.target as HTMLInputElement).value)}
          placeholder="https://api.example.com/v1/resources"
          className={cm.flex1}
          aria-label={t('httpInspector.urlLabel', {}, { defaultValue: 'URL' })}
        />
        <Button variant="solid" color="primary" onClick={() => void onSend()} disabled={sending}>
          {sending
            ? t('httpInspector.sending', {}, { defaultValue: 'Sending…' })
            : t('httpInspector.send', {}, { defaultValue: 'Send' })}
        </Button>
      </div>
      <div className={cm.stack(1 as const)}>
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {t('httpInspector.headers', {}, { defaultValue: 'Headers' })}
        </span>
        {headers.map((h, i) => (
          <div key={i} className={cm.flex({ align: 'center', gap: 'xs' })}>
            <Input
              type="text"
              value={h.key}
              onChange={(e) => setHeader(i, (e.target as HTMLInputElement).value, h.value)}
              placeholder={t('httpInspector.headerPlaceholder', {}, { defaultValue: 'Header' })}
            />
            <Input
              type="text"
              value={h.value}
              onChange={(e) => setHeader(i, h.key, (e.target as HTMLInputElement).value)}
              placeholder={t('httpInspector.valuePlaceholder', {}, { defaultValue: 'Value' })}
              className={cm.flex1}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onHeadersChange(headers.filter((_, j) => j !== i))}
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onHeadersChange([...headers, { key: '', value: '' }])}
        >
          + {t('httpInspector.addHeader', {}, { defaultValue: 'Add header' })}
        </Button>
      </div>
      {method !== 'GET' && method !== 'HEAD' && (
        <div className={cm.stack(1 as const)}>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
            {t('httpInspector.body', {}, { defaultValue: 'Body' })}
          </span>
          {/* The placeholder is a JSON example — input, not prose: never translated. */}
          <Textarea
            {...NOT_TRANSLATED}
            value={body}
            onChange={(e) => onBodyChange((e.target as HTMLTextAreaElement).value)}
            rows={6}
            placeholder='{"key": "value"}'
          />
        </div>
      )}
      {response && (
        <div className={cm.stack(2)}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(cm.bgTone(statusTone(response.statusCode)), cm.textOnTone)}
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              {response.statusCode} {response.statusText ?? ''}
            </span>
            {response.durationMs !== undefined && (
              <span className={cm.textSize('xs')}>{response.durationMs}ms</span>
            )}
          </div>
          <pre className={cm.cn(cm.sp('p', 3), cm.textSize('xs'))} style={{ overflowX: 'auto' }}>
            {response.body}
          </pre>
        </div>
      )}
    </div>
  )
}

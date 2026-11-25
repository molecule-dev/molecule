import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select, Textarea } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

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
    <Box as="div" className={cm.cn(cm.stack(3), className)}>
      <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
        {/* The options are protocol tokens (GET, POST, …): never translated,
            so the element carries HTML's own `translate="no"`. */}
        <Select
          translate="no"
          value={method}
          onValueChange={(selected) => {
            const next = METHODS.find((method) => method === selected)
            if (next) onMethodChange(next)
          }}
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
      </Box>
      <Box as="div" className={cm.stack(1 as const)}>
        <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {t('httpInspector.headers', {}, { defaultValue: 'Headers' })}
        </Text>
        {headers.map((h, i) => (
          <Box as="div" key={i} className={cm.flex({ align: 'center', gap: 'xs' })}>
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
          </Box>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onHeadersChange([...headers, { key: '', value: '' }])}
        >
          + {t('httpInspector.addHeader', {}, { defaultValue: 'Add header' })}
        </Button>
      </Box>
      {method !== 'GET' && method !== 'HEAD' && (
        <Box as="div" className={cm.stack(1 as const)}>
          <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
            {t('httpInspector.body', {}, { defaultValue: 'Body' })}
          </Text>
          {/* The placeholder is a JSON example — input, not prose: never translated. */}
          <Textarea
            {...NOT_TRANSLATED}
            value={body}
            onChange={(e) => onBodyChange((e.target as HTMLTextAreaElement).value)}
            rows={6}
            placeholder='{"key": "value"}'
          />
        </Box>
      )}
      {response && (
        <Box as="div" className={cm.stack(2)}>
          <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Text
              as="span"
              className={cm.cn(cm.bgTone(statusTone(response.statusCode)), cm.textOnTone)}
              style={{ borderRadius: 4, fontWeight: '700' }}
              webStyle={{ padding: '2px 8px' }}
            >
              {response.statusCode} {response.statusText ?? ''}
            </Text>
            {response.durationMs !== undefined && (
              <Text as="span" className={cm.textSize('xs')}>
                {response.durationMs}ms
              </Text>
            )}
          </Box>
          <Text
            as="pre"
            className={cm.cn(cm.sp('p', 3), cm.textSize('xs'))}
            webStyle={{ overflowX: 'auto' }}
          >
            {response.body}
          </Text>
        </Box>
      )}
    </Box>
  )
}

import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select, Textarea } from '@molecule/app-ui-react'

/**
 *
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
/**
 *
 */
export interface HttpHeader {
  key: string
  value: string
}
/**
 *
 */
export interface HttpResponse {
  statusCode: number
  statusText?: string
  durationMs?: number
  body: string
  headers?: HttpHeader[]
}

interface HttpInspectorProps {
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
 *
 * @param code
 */
function statusColor(code: number): string {
  if (code < 300) return '#22c55e'
  if (code < 400) return '#60a5fa'
  if (code < 500) return '#eab308'
  return '#ef4444'
}

/**
 * Controlled HTTP request builder + response panel. App owns request
 * state + the actual `fetch`; this component renders the UI.
 *
 * Shape: method + URL row, headers key/value editor, body textarea,
 * Send button, then a response panel showing status + timing + body.
 * @param root0
 * @param root0.method
 * @param root0.onMethodChange
 * @param root0.url
 * @param root0.onUrlChange
 * @param root0.headers
 * @param root0.onHeadersChange
 * @param root0.body
 * @param root0.onBodyChange
 * @param root0.onSend
 * @param root0.sending
 * @param root0.response
 * @param root0.className
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
}: HttpInspectorProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  /**
   *
   * @param i
   * @param key
   * @param value
   */
  function setHeader(i: number, key: string, value: string) {
    const next = [...headers]
    next[i] = { key, value }
    onHeadersChange(next)
  }
  return (
    <div className={cm.cn(cm.stack(3), className)}>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Select
          value={method}
          onValueChange={(v) => onMethodChange(v as HttpMethod)}
          options={METHODS.map((m) => ({ value: m, label: m }))}
          aria-label="HTTP method"
        />
        <Input
          type="text"
          value={url}
          onChange={(e) => onUrlChange((e.target as HTMLInputElement).value)}
          placeholder="https://api.example.com/v1/resources"
          className={cm.flex1}
          aria-label="URL"
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
              placeholder="Header"
            />
            <Input
              type="text"
              value={h.value}
              onChange={(e) => setHeader(i, h.key, (e.target as HTMLInputElement).value)}
              placeholder="Value"
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
          <Textarea
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
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: statusColor(response.statusCode),
                color: '#fff',
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

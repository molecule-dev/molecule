/**
 * HTTP request builder + response inspector.
 *
 * Exports `<HttpInspector>`, `HttpMethod`, `HttpHeader`, `HttpResponse` types.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { HttpInspector } from '@molecule/app-http-inspector-react'
 * import type { HttpMethod, HttpHeader, HttpResponse } from '@molecule/app-http-inspector-react'
 *
 * const [method, setMethod] = useState<HttpMethod>('GET')
 * const [url, setUrl] = useState('https://api.example.com/v1/users')
 * const [headers, setHeaders] = useState<HttpHeader[]>([])
 * const [body, setBody] = useState('')
 * const [sending, setSending] = useState(false)
 * const [response, setResponse] = useState<HttpResponse | null>(null)
 *
 * <HttpInspector
 *   method={method} onMethodChange={setMethod}
 *   url={url} onUrlChange={setUrl}
 *   headers={headers} onHeadersChange={setHeaders}
 *   body={body} onBodyChange={setBody}
 *   onSend={handleSend} sending={sending} response={response}
 * />
 * ```
 *
 * @module
 */

export * from './HttpInspector.js'

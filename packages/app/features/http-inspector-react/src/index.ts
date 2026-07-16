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
 * @remarks
 * - Fully controlled and transport-agnostic: the component renders the
 *   builder UI only — YOUR `onSend` performs the fetch and sets `response`
 *   (`HttpResponse` with statusCode/durationMs/body). `sending` disables the
 *   Send button.
 * - Requires `@molecule/app-react`'s `I18nProvider` (`useTranslation()`
 *   THROWS without it) and a bonded ClassMap; button/tab labels come from the
 *   `@molecule/app-locales-http-inspector` companion bond.
 * - The body editor renders only for methods with bodies (hidden for GET and
 *   HEAD).
 * - The response status chip uses fixed severity colors (green/blue/
 *   yellow/red) rendered inline — they do not follow the app theme.
 *
 * @module
 */

export * from './HttpInspector.js'

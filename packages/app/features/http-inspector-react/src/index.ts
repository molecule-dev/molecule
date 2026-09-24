/**
 * HTTP request builder + response inspector.
 *
 * Exports `<HttpInspector>`, `HttpMethod`, `HttpHeader`, `HttpResponse` types.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { createFetchClient, HttpError } from '@molecule/app-http'
 * import {
 *   type HttpHeader,
 *   HttpInspector,
 *   type HttpMethod,
 *   type HttpResponse,
 * } from '@molecule/app-http-inspector-react'
 *
 * // A separate client: no app auth token, no baseURL — the URL is sent as typed.
 * const client = createFetchClient()
 *
 * export function ApiPlayground() {
 *   const [method, setMethod] = useState<HttpMethod>('GET')
 *   const [url, setUrl] = useState('https://api.example.com/v1/users')
 *   const [headers, setHeaders] = useState<HttpHeader[]>([{ key: 'Accept', value: 'application/json' }])
 *   const [body, setBody] = useState('')
 *   const [sending, setSending] = useState(false)
 *   const [response, setResponse] = useState<HttpResponse | null>(null)
 *
 *   async function send(): Promise<void> {
 *     setSending(true)
 *     const started = performance.now()
 *     try {
 *       const res = await client.request<string>({
 *         method,
 *         url,
 *         headers: Object.fromEntries(headers.filter((h) => h.key).map((h) => [h.key, h.value])),
 *         data: body ? JSON.parse(body) : undefined,
 *         responseType: 'text',
 *       })
 *       setResponse({ statusCode: res.status, statusText: res.statusText, body: res.data, durationMs: Math.round(performance.now() - started) })
 *     } catch (error) {
 *       // Non-2xx responses reject with HttpError — show them like any other response.
 *       const res = error instanceof HttpError ? error.response : undefined
 *       setResponse({
 *         statusCode: res?.status ?? 0,
 *         statusText: res?.statusText ?? (error instanceof Error ? error.message : String(error)),
 *         body: typeof res?.data === 'string' ? res.data : '',
 *         durationMs: Math.round(performance.now() - started),
 *       })
 *     } finally {
 *       setSending(false)
 *     }
 *   }
 *
 *   return (
 *     <HttpInspector
 *       method={method}
 *       onMethodChange={setMethod}
 *       url={url}
 *       onUrlChange={setUrl}
 *       headers={headers}
 *       onHeadersChange={setHeaders}
 *       body={body}
 *       onBodyChange={setBody}
 *       onSend={send}
 *       sending={sending}
 *       response={response}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Fully controlled and transport-agnostic: the component renders the
 *   builder UI only — it sends NOTHING. YOUR `onSend` performs the request
 *   (through `@molecule/app-http`, not raw `fetch`) and sets `response`
 *   (this package's `HttpResponse`: `statusCode`/`statusText`/`durationMs`/
 *   `body` string — NOT app-http's `HttpResponse`, which has `status`/`data`;
 *   map one to the other). `sending` disables the Send button but you must
 *   set it yourself.
 * - `@molecule/app-http` REJECTS non-2xx responses with `HttpError` (the
 *   response is on `error.response`) and JSON-stringifies `data` — so parse
 *   the body text first and request `responseType: 'text'` to show the raw
 *   body. Use a separate `createFetchClient()` for arbitrary URLs: the bonded
 *   app client adds the app's auth token / baseURL and fires 401 handlers.
 * - Requires `@molecule/app-react`'s `I18nProvider` (`useTranslation()`
 *   THROWS without it), a bonded ClassMap, and a bonded icon set
 *   (`setIconSet(iconSet)` from `@molecule/app-icons` +
 *   `@molecule/app-icons-molecule`) — the method `Select` from
 *   `@molecule/app-ui-react` throws without one; button/tab labels come from the
 *   `@molecule/app-locales-http-inspector` companion bond.
 * - The body editor renders only for methods with bodies (hidden for GET and
 *   HEAD).
 * - The method/URL aria-labels ("HTTP method", "URL") and header input
 *   placeholders are fixed English.
 * - The response status chip uses fixed severity colors (green/blue/
 *   yellow/red) rendered inline — they do not follow the app theme.
 *
 * @module
 */

export * from './HttpInspector.js'

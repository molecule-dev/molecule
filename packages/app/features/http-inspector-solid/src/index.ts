/**
 * Solid HTTP request builder + response inspector.
 *
 * Exports `HttpInspector`, `HttpMethod`, `HttpHeader`, `HttpResponse` types. It
 * is the Solid counterpart of `@molecule/app-http-inspector-react`: the same
 * props (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { createSignal, type Component } from 'solid-js'
 * import { HttpInspector } from '@molecule/app-http-inspector-solid'
 * import type { HttpHeader, HttpMethod, HttpResponse } from '@molecule/app-http-inspector-solid'
 *
 * export const Inspector: Component = () => {
 *   const [method, setMethod] = createSignal<HttpMethod>('GET')
 *   const [url, setUrl] = createSignal('https://api.example.com/v1/users')
 *   const [headers, setHeaders] = createSignal<HttpHeader[]>([])
 *   const [body, setBody] = createSignal('')
 *   const [sending, setSending] = createSignal(false)
 *   const [response, setResponse] = createSignal<HttpResponse | null>(null)
 *
 *   async function send() {
 *     setSending(true)
 *     try {
 *       // YOUR fetch here; then setResponse(...)
 *     } finally {
 *       setSending(false)
 *     }
 *   }
 *
 *   return (
 *     <HttpInspector
 *       method={method()}
 *       onMethodChange={setMethod}
 *       url={url()}
 *       onUrlChange={setUrl}
 *       headers={headers()}
 *       onHeadersChange={setHeaders}
 *       body={body()}
 *       onBodyChange={setBody}
 *       onSend={send}
 *       sending={sending()}
 *       response={response()}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Fully controlled and transport-agnostic: the component renders the
 *   builder UI only — YOUR `onSend` performs the fetch and sets `response`
 *   (`HttpResponse` with statusCode/durationMs/body). `sending` disables the
 *   Send button.
 * - Requires the Solid binding's i18n provider (`useTranslation()` THROWS
 *   without it) and a bonded ClassMap; button/tab labels come from the
 *   `@molecule/app-locales-http-inspector` companion bond.
 * - The body editor renders only for methods with bodies (hidden for GET and
 *   HEAD).
 * - The response status chip uses fixed severity colors (green/blue/
 *   yellow/red) rendered inline — they do not follow the app theme.
 *
 * @module
 */

export * from './HttpInspector.jsx'
export * from './types.js'

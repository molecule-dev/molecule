/**
 * Svelte HTTP request builder + response inspector — the Svelte counterpart of
 * `@molecule/app-http-inspector-react`, with the same props and the same DOM.
 *
 * Exports `HttpInspector`, `HttpMethod`, `HttpHeader`, `HttpResponse` types.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { HttpInspector } from '@molecule/app-http-inspector-svelte'
 *   import type { HttpHeader, HttpMethod, HttpResponse } from '@molecule/app-http-inspector-svelte'
 *
 *   let method = $state<HttpMethod>('GET')
 *   let url = $state('https://api.example.com/v1/users')
 *   let headers = $state<HttpHeader[]>([])
 *   let body = $state('')
 *   let sending = $state(false)
 *   let response = $state<HttpResponse | null>(null)
 *
 *   async function send() {
 *     sending = true
 *     try {
 *       // YOUR fetch here; then set `response`
 *     } finally {
 *       sending = false
 *     }
 *   }
 * </script>
 *
 * <HttpInspector
 *   {method}
 *   onMethodChange={(next) => (method = next)}
 *   {url}
 *   onUrlChange={(next) => (url = next)}
 *   {headers}
 *   onHeadersChange={(next) => (headers = next)}
 *   {body}
 *   onBodyChange={(next) => (body = next)}
 *   onSend={send}
 *   {sending}
 *   {response}
 * />
 * ```
 *
 * @remarks
 * - Fully controlled and transport-agnostic: the component renders the
 *   builder UI only — YOUR `onSend` performs the fetch and sets `response`
 *   (`HttpResponse` with statusCode/durationMs/body). `sending` disables the
 *   Send button.
 * - Requires the Svelte binding's i18n provider (`useTranslation()` THROWS
 *   without it) and a bonded ClassMap; button/tab labels come from the
 *   `@molecule/app-locales-http-inspector` companion bond.
 * - The body editor renders only for methods with bodies (hidden for GET and
 *   HEAD).
 * - The response status chip uses fixed severity colors (green/blue/
 *   yellow/red) rendered inline — they do not follow the app theme.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'

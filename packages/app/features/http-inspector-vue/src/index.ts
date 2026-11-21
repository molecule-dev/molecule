/**
 * Vue HTTP request builder + response inspector.
 *
 * Exports `<HttpInspector>`, `HttpMethod`, `HttpHeader`, `HttpResponse` types.
 * It is the Vue counterpart of `@molecule/app-http-inspector-react`: the same
 * props (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { HttpInspector } from '@molecule/app-http-inspector-vue'
 * import type { HttpHeader, HttpMethod, HttpResponse } from '@molecule/app-http-inspector-vue'
 *
 * const Inspector = defineComponent({
 *   setup() {
 *     const method = ref<HttpMethod>('GET')
 *     const url = ref('https://api.example.com/v1/users')
 *     const headers = ref<HttpHeader[]>([])
 *     const body = ref('')
 *     const sending = ref(false)
 *     const response = ref<HttpResponse | null>(null)
 *
 *     async function send() {
 *       sending.value = true
 *       try {
 *         // YOUR fetch here; then set `response`
 *       } finally {
 *         sending.value = false
 *       }
 *     }
 *
 *     return () =>
 *       h(HttpInspector, {
 *         method: method.value,
 *         onMethodChange: (m: HttpMethod) => (method.value = m),
 *         url: url.value,
 *         onUrlChange: (u: string) => (url.value = u),
 *         headers: headers.value,
 *         onHeadersChange: (next: HttpHeader[]) => (headers.value = next),
 *         body: body.value,
 *         onBodyChange: (b: string) => (body.value = b),
 *         onSend: send,
 *         sending: sending.value,
 *         response: response.value,
 *       })
 *   },
 * })
 *
 * createApp(Inspector).mount('#app')
 * ```
 *
 * @remarks
 * - Fully controlled and transport-agnostic: the component renders the
 *   builder UI only — YOUR `onSend` performs the fetch and sets `response`
 *   (`HttpResponse` with statusCode/durationMs/body). `sending` disables the
 *   Send button.
 * - Requires the Vue binding's i18n provider (`useTranslation()` THROWS
 *   without it) and a bonded ClassMap; button/tab labels come from the
 *   `@molecule/app-locales-http-inspector` companion bond.
 * - The body editor renders only for methods with bodies (hidden for GET and
 *   HEAD).
 * - The response status chip uses fixed severity colors (green/blue/
 *   yellow/red) rendered inline — they do not follow the app theme.
 *
 * @module
 */

export * from './HttpInspector.js'
export * from './types.js'

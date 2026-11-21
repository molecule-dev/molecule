/**
 * Angular HTTP request builder + response inspector — the counterpart of
 * `@molecule/app-http-inspector-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<HttpInspector>`, `HttpMethod`, `HttpHeader`, `HttpResponse` types.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { HttpInspector } from '@molecule/app-http-inspector-angular'
 * import type { HttpHeader, HttpMethod, HttpResponse } from '@molecule/app-http-inspector-angular'
 *
 * @Component({
 *   selector: 'app-inspector',
 *   standalone: true,
 *   imports: [HttpInspector],
 *   template: `
 *     <div
 *       mol-http-inspector
 *       [method]="method()"
 *       (onMethodChange)="method.set($event)"
 *       [url]="url()"
 *       (onUrlChange)="url.set($event)"
 *       [headers]="headers()"
 *       (onHeadersChange)="headers.set($event)"
 *       [body]="body()"
 *       (onBodyChange)="body.set($event)"
 *       [onSend]="send"
 *       [sending]="sending()"
 *       [response]="response()"
 *     ></div>
 *   `,
 * })
 * export class Inspector {
 *   readonly method = signal<HttpMethod>('GET')
 *   readonly url = signal('https://api.example.com/v1/users')
 *   readonly headers = signal<HttpHeader[]>([])
 *   readonly body = signal('')
 *   readonly sending = signal(false)
 *   readonly response = signal<HttpResponse | null>(null)
 *
 *   async send() {
 *     this.sending.set(true)
 *     try {
 *       // YOUR fetch here; then this.response.set(...)
 *     } finally {
 *       this.sending.set(false)
 *     }
 *   }
 * }
 * ```
 *
 * @remarks
 * - Fully controlled and transport-agnostic: the component renders the
 *   builder UI only — YOUR `onSend` performs the fetch and sets `response`
 *   (`HttpResponse` with statusCode/durationMs/body). `sending` disables the
 *   Send button.
 * - Requires the Angular binding's i18n provider (`useTranslation()` THROWS
 *   without it) and a bonded ClassMap; button/tab labels come from the
 *   `@molecule/app-locales-http-inspector` companion bond.
 * - The body editor renders only for methods with bodies (hidden for GET and
 *   HEAD).
 * - The response status chip uses fixed severity colors (green/blue/
 *   yellow/red) rendered inline — they do not follow the app theme.
 *
 * @module
 */

export * from './http-inspector.component.js'
export * from './types.js'

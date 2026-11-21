/**
 * HttpInspector component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select, Textarea } from '@molecule/app-ui-angular'

import type { HttpHeader, HttpMethod, HttpResponse } from './types.js'

/** The method options, in React's order. */
const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

/**
 * Returns the semantic tone representing the severity of an HTTP status code:
 * the theme's success green below 300, info blue for a redirect, warning amber
 * for a client error, error red for a server error.
 *
 * @param code - The response status code.
 * @returns The badge's semantic tone.
 */
const statusTone = (code: number): ColorVariant => {
  if (code < 300) return 'success'
  if (code < 400) return 'info'
  if (code < 500) return 'warning'
  return 'error'
}

/**
 * HttpInspector component.
 *
 * Controlled HTTP request builder + response panel. The host IS the outer
 * `<div>` React renders (`div[mol-http-inspector]`), with the same classes.
 * App owns request state + the actual `fetch`; this component renders the UI:
 * method + URL row, headers key/value editor, body textarea (methods that
 * allow a body), Send button, then a response panel showing status + timing +
 * body.
 */
@Component({
  selector: 'div[mol-http-inspector]',
  standalone: true,
  imports: [Button, Input, Select, Textarea],
  inputs: [
    'method',
    'onMethodChange',
    'url',
    'onUrlChange',
    'headers',
    'onHeadersChange',
    'body',
    'onBodyChange',
    'onSend',
    'sending',
    'response',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="rowClasses()"
    ><!-- The options are protocol tokens (GET, POST, …): never translated, so the element carries HTML's own translate="no" attribute. --><div
      mol-select
      [id]="'http-inspector-method'"
      [options]="methodOptions"
      [value]="method"
      (valueChange)="handleMethodChange($event)"
      translate="no"
      [attr.aria-label]="methodLabel()"
    ></div
    ><!-- The placeholder is an example URL — input, not prose: never translated. --><div
      mol-input
      [id]="'http-inspector-url'"
      [type]="'text'"
      [value]="url"
      (change)="handleUrlChange($event)"
      placeholder="https://api.example.com/v1/resources"
      translate="no"
      [className]="flexClasses()"
      [attr.aria-label]="urlLabel()"
    ></div
    ><button
      mol-button
      [variant]="'solid'"
      [color]="'primary'"
      (click)="send()"
      [disabled]="!!sending"
    >{{ sending ? sendingText() : sendText() }}</button
  ></div>
  <div [class]="stack1Classes()"><span [class]="labelClasses()">{{ headersLabel() }}</span>
    @for (header of headers; track $index) {
      <div [class]="headerRowClasses()"
        ><div
          mol-input
          [id]="'http-inspector-header-' + $index + '-key'"
          [type]="'text'"
          [value]="header.key"
          (change)="handleHeaderKey($index, $event)"
          [placeholder]="headerPlaceholder()"
        ></div
        ><div
          mol-input
          [id]="'http-inspector-header-' + $index + '-value'"
          [type]="'text'"
          [value]="header.value"
          (change)="handleHeaderValue($index, $event)"
          [placeholder]="valuePlaceholder()"
          [className]="flexClasses()"
        ></div
        ><button mol-button [variant]="'ghost'" [size]="'sm'" (click)="removeHeader($index)">×</button
      ></div>
    }
    <button mol-button [variant]="'ghost'" [size]="'sm'" (click)="addHeader()">+ {{ addHeaderLabel() }}</button>
  </div>
  @if (showBody()) {
    <div [class]="stack1Classes()"><span [class]="labelClasses()">{{ bodyLabel() }}</span><!-- The placeholder is a JSON example — input, not prose: never translated. --><div
      mol-textarea
      [id]="'http-inspector-body'"
      [value]="body"
      (change)="handleBodyChange($event)"
      [rows]="6"
      [placeholder]="bodyPlaceholder"
      translate="no"
    ></div></div>
  }
  @if (response; as resp) {
    <div [class]="stack2Classes()">
      <div [class]="rowClasses()"
        ><span [class]="statusClasses(resp.statusCode)" [style]="statusStyle()">{{ resp.statusCode }} {{ resp.statusText ?? '' }}</span
        >@if (resp.durationMs !== undefined) {<span [class]="textXsClasses()">{{ resp.durationMs }}ms</span>}</div
      ><pre [class]="preClasses()" [style]="preStyle()">@if (resp.body !== '') {<ng-container>{{ resp.body }}</ng-container>}</pre>
    </div>
  }`,
})
export class HttpInspector {
  /** The request's HTTP method. */
  method: HttpMethod = 'GET'
  /** Called with the new method when the user picks one (React's `onMethodChange`). */
  onMethodChange?: (method: HttpMethod) => void
  /** The request URL. */
  url = ''
  /** Called with the new URL as the user types (React's `onUrlChange`). */
  onUrlChange?: (url: string) => void
  /** The request headers, in render order. */
  headers: HttpHeader[] = []
  /** Called with the next header list on any header edit (React's `onHeadersChange`). */
  onHeadersChange?: (headers: HttpHeader[]) => void
  /** The request body. */
  body = ''
  /** Called with the new body as the user types (React's `onBodyChange`). */
  onBodyChange?: (body: string) => void
  /** Sends the request (React's `onSend`). */
  onSend?: () => void | Promise<void>
  /** Whether a send is in flight (React's `sending`). */
  sending?: boolean
  /** The last response to show (React's `response`). */
  response?: HttpResponse | null
  /** Extra classes on the outer wrapper (React's `className`). */
  className?: string

  /** The method options, in React's order. */
  readonly methodOptions = METHODS.map((method) => ({ value: method, label: method }))

  /** The body textarea's placeholder (React's literal). */
  readonly bodyPlaceholder = '{"key": "value"}'

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the labels on a locale switch (the static
   * `t` does not).
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.stack(3), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * The method + URL row's class (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * A header row's class (React's `cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  headerRowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The headers / body section's class (React's `cm.stack(1)`).
   * @returns The class string.
   */
  stack1Classes(): string {
    return this.cm().stack(1)
  }

  /**
   * The response section's class (React's `cm.stack(2)`).
   * @returns The class string.
   */
  stack2Classes(): string {
    return this.cm().stack(2)
  }

  /**
   * A section label's class (React's `cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The timing span's class (React's `cm.textSize('xs')`).
   * @returns The class string.
   */
  textXsClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The response body panel's class (React's `cm.cn(cm.sp('p', 3), cm.textSize('xs'))`).
   * @returns The class string.
   */
  preClasses(): string {
    return this.cm().cn(this.cm().sp('p', 3), this.cm().textSize('xs'))
  }

  /**
   * The URL input's extra class (React's `cm.flex1`).
   * @returns The class string.
   */
  flexClasses(): string {
    return this.cm().flex1
  }

  /**
   * The status badge's class list (React's `cm.bgTone(tone)` + `cm.textOnTone`).
   *
   * @param code - The response status code.
   * @returns The class string.
   */
  statusClasses(code: number): string {
    return this.cm().cn(this.cm().bgTone(statusTone(code)), this.cm().textOnTone)
  }

  /**
   * The status badge's inline style (React's padding, radius and weight; the
   * tone colours come from {@link statusClasses}).
   *
   * @returns The style map.
   */
  statusStyle(): Record<string, string> {
    return {
      padding: '2px 8px',
      'border-radius': '4px',
      'font-weight': '700',
    }
  }

  /**
   * The response body panel's inline style (horizontal scrolling).
   * @returns The style map.
   */
  preStyle(): Record<string, string> {
    return { 'overflow-x': 'auto' }
  }

  /**
   * Whether the body editor renders (React hides it for GET and HEAD).
   * @returns True when the method allows a body.
   */
  showBody(): boolean {
    return this.method !== 'GET' && this.method !== 'HEAD'
  }

  /**
   * The Send button's pending label (React's `httpInspector.sending`).
   * @returns The label text.
   */
  sendingText(): string {
    return this.i18n.t('httpInspector.sending', {}, { defaultValue: 'Sending…' })
  }

  /**
   * The Send button's idle label (React's `httpInspector.send`).
   * @returns The label text.
   */
  sendText(): string {
    return this.i18n.t('httpInspector.send', {}, { defaultValue: 'Send' })
  }

  /**
   * The headers section's label (React's `httpInspector.headers`).
   * @returns The label text.
   */
  headersLabel(): string {
    return this.i18n.t('httpInspector.headers', {}, { defaultValue: 'Headers' })
  }

  /**
   * The body section's label (React's `httpInspector.body`).
   * @returns The label text.
   */
  bodyLabel(): string {
    return this.i18n.t('httpInspector.body', {}, { defaultValue: 'Body' })
  }

  /**
   * The add-header button's label (React's `httpInspector.addHeader`).
   * @returns The label text.
   */
  addHeaderLabel(): string {
    return this.i18n.t('httpInspector.addHeader', {}, { defaultValue: 'Add header' })
  }

  /**
   * The method select's accessible label (React's `httpInspector.methodLabel`).
   * @returns The label text.
   */
  methodLabel(): string {
    return this.i18n.t('httpInspector.methodLabel', {}, { defaultValue: 'HTTP method' })
  }

  /**
   * The URL field's accessible label (React's `httpInspector.urlLabel`).
   * @returns The label text.
   */
  urlLabel(): string {
    return this.i18n.t('httpInspector.urlLabel', {}, { defaultValue: 'URL' })
  }

  /**
   * A header row's key placeholder (React's `httpInspector.headerPlaceholder`).
   * @returns The placeholder text.
   */
  headerPlaceholder(): string {
    return this.i18n.t('httpInspector.headerPlaceholder', {}, { defaultValue: 'Header' })
  }

  /**
   * A header row's value placeholder (React's `httpInspector.valuePlaceholder`).
   * @returns The placeholder text.
   */
  valuePlaceholder(): string {
    return this.i18n.t('httpInspector.valuePlaceholder', {}, { defaultValue: 'Value' })
  }

  /**
   * Reports a picked method (React's `onMethodChange`).
   *
   * @param method - The selected option value.
   */
  handleMethodChange(method: string): void {
    this.onMethodChange?.(method as HttpMethod)
  }

  /**
   * Adopts the typed URL (React's `onUrlChange`).
   *
   * @param event - The native input event.
   */
  handleUrlChange(event: Event): void {
    this.onUrlChange?.((event.target as HTMLInputElement).value)
  }

  /**
   * Updates a single header's key, keeping its value (React's `setHeader`).
   *
   * @param i - The row index.
   * @param event - The native input event.
   */
  handleHeaderKey(i: number, event: Event): void {
    const next = [...this.headers]
    next[i] = { key: (event.target as HTMLInputElement).value, value: next[i].value }
    this.onHeadersChange?.(next)
  }

  /**
   * Updates a single header's value, keeping its key (React's `setHeader`).
   *
   * @param i - The row index.
   * @param event - The native input event.
   */
  handleHeaderValue(i: number, event: Event): void {
    const next = [...this.headers]
    next[i] = { key: next[i].key, value: (event.target as HTMLInputElement).value }
    this.onHeadersChange?.(next)
  }

  /**
   * Removes one header (React's `headers.filter((_, j) => j !== i)`).
   *
   * @param i - The row index.
   */
  removeHeader(i: number): void {
    this.onHeadersChange?.(this.headers.filter((_, j) => j !== i))
  }

  /**
   * Appends an empty header (React's `[...headers, { key: '', value: '' }]`).
   */
  addHeader(): void {
    this.onHeadersChange?.([...this.headers, { key: '', value: '' }])
  }

  /**
   * Adopts the typed body (React's `onBodyChange`).
   *
   * @param event - The native input event.
   */
  handleBodyChange(event: Event): void {
    this.onBodyChange?.((event.target as HTMLTextAreaElement).value)
  }

  /**
   * Calls the app's send handler (React's `void onSend()`).
   */
  send(): void {
    void this.onSend?.()
  }
}

/**
 * Types of `@molecule/app-http-inspector-angular` — the Angular counterpart of
 * `@molecule/app-http-inspector-react`, same props and DOM.
 *
 * @module
 */

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

/** Inputs accepted by {@link HttpInspector} — the same props `@molecule/app-http-inspector-react` accepts. */
export interface HttpInspectorProps {
  /** The request's HTTP method. */
  method: HttpMethod
  /** Called with the new method when the user picks one. */
  onMethodChange: (method: HttpMethod) => void
  /** The request URL. */
  url: string
  /** Called with the new URL as the user types. */
  onUrlChange: (url: string) => void
  /** The request headers, in render order. */
  headers: HttpHeader[]
  /** Called with the next header list on any header edit. */
  onHeadersChange: (headers: HttpHeader[]) => void
  /** The request body. */
  body: string
  /** Called with the new body as the user types. */
  onBodyChange: (body: string) => void
  /** Sends the request; the app owns the fetch and the response state. */
  onSend: () => void | Promise<void>
  /** Whether a send is in flight (disables the Send button, shows `Sending…`). */
  sending?: boolean
  /** The last response to show, or `null`/absent for none. */
  response?: HttpResponse | null
  /** Extra classes on the outer wrapper. */
  className?: string
}

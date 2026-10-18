/**
 * Classify a failed request instead of reading its `status` by hand.
 *
 * A failure from this package is an {@link HttpError} whose `status` is either an
 * HTTP status (the server answered) or `0` (it did not — the request was aborted or
 * the network failed). Code that clears a session must ask "did the server REJECT
 * the credential?", which is `status === 401 || status === 403` and nothing else:
 *
 * ```typescript
 * try {
 *   await http.get('/projects')
 * } catch (err) {
 *   if (isAuthFailure(err)) clearSession()
 *   else if (isNoResponse(err)) return // aborted / offline — keep the session
 *   else showError(err)
 * }
 * ```
 *
 * `err instanceof HttpError && err.status < 500` is the trap these helpers exist to
 * replace: an aborted request (a component unmounting, a route change cancelling an
 * in-flight fetch) and a network outage both arrive with `status === 0`, so that
 * check signs the user out on every navigation that cancels a request.
 *
 * @module
 */

import { HttpError } from './types.js'

/**
 * Whether `err` is an {@link HttpError} from this package.
 *
 * @param err - Any thrown value.
 * @returns True for an `HttpError`.
 */
export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError
}

/**
 * Whether the server REJECTED the request's credential — the only failure that
 * justifies clearing a session.
 *
 * `401` (unauthenticated/expired token) and `403` (authenticated but refused) are
 * the two statuses that say "this credential no longer authorizes this session".
 * Everything else — `0` (aborted or offline), `404` (wrong endpoint), `5xx` (server
 * fault), a rate limit — says nothing about the credential.
 *
 * @param err - Any thrown value.
 * @returns True only when `err` is an `HttpError` with status 401 or 403.
 */
export function isAuthFailure(err: unknown): boolean {
  return isHttpError(err) && (err.status === 401 || err.status === 403)
}

/**
 * Whether no response was received at all: the request was aborted or the network
 * failed. `status === 0` is not an HTTP status — it must never be read as
 * "the user is not signed in".
 *
 * @param err - Any thrown value.
 * @returns True when `err` is an `HttpError` with status `0`.
 */
export function isNoResponse(err: unknown): boolean {
  return isHttpError(err) && err.status === 0
}

/**
 * Whether the request was ABORTED (an `AbortController` signal, or the browser
 * cancelling the fetch during a navigation) rather than failing on the network.
 *
 * Both arrive as `status === 0`; this distinguishes them, so a UI can stay silent
 * for a cancelled request while still reporting a real outage.
 *
 * @param err - Any thrown value.
 * @returns True when `err` is an `HttpError` flagged `aborted`.
 */
export function isAborted(err: unknown): boolean {
  return isHttpError(err) && err.aborted
}

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
 * Whether `err` is an {@link HttpError} or a compatible branded request failure.
 * `@molecule/app-auth` uses the same global brand for its non-ok responses, so
 * this also recognizes them across realms and duplicated package copies without
 * sharing the same prototype. Equivalent to `err instanceof HttpError`; subclass
 * `instanceof` checks still require the subclass's own prototype.
 *
 * @param err - Any thrown value.
 * @returns True for an `HttpError` or a compatibly branded request failure.
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

/**
 * The message the server sent with a failed request: the `error` (else
 * `message`) string of its JSON body, or `undefined` when the server sent none
 * (no response, an empty body, a non-JSON body).
 *
 * Show this, then a translated fallback, never `err.message`: an
 * `HttpError`'s own message is the transport's status line (`Request failed
 * with status code 403`), written for logs. Molecule API routes answer a
 * refused request with `{ error }` already translated for the user (a wrong
 * password, an invalid two-factor code, a declined checkout).
 *
 * ```typescript
 * catch (err) {
 *   setError(serverErrorMessage(err) ?? t('settings.failedToDeleteAccount', undefined, {
 *     defaultValue: 'Failed to delete account.',
 *   }))
 * }
 * ```
 *
 * @param err - Any thrown value.
 * @returns The server's non-empty message, or `undefined`.
 */
export function serverErrorMessage(err: unknown): string | undefined {
  if (!isHttpError(err)) return undefined
  const body = err.response?.data
  if (typeof body !== 'object' || body === null) return undefined
  const { error, message } = body as { error?: unknown; message?: unknown }
  for (const candidate of [error, message])
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  return undefined
}
